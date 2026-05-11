import type { UserRepository } from "./repository.js";
import type { WakaTimeClient } from "./wakatime.js";
import { computeLeaderboard, getDailyRankRewardCoins, type DailyStat } from "@molty/shared";
import { shiftDateKey, toDateKeyInTimeZone } from "./date-key.js";
import { awardDailyAchievements } from "./achievements.js";
import {
  DEFAULT_WAKATIME_BATCH_DELAY_MS,
  DEFAULT_WAKATIME_BATCH_SIZE,
  runInBatches
} from "./wakatime-rate-limit.js";
export { DEFAULT_WAKATIME_WEEKLY_RANGE } from "./wakatime-weekly-cache.js";

export const DEFAULT_WAKATIME_SYNC_INTERVAL_MS = 2 * 60 * 1000;
export const IRAN_DAILY_SYNC_TIME_ZONE = "Asia/Tehran";
export const IRAN_DAILY_SYNC_HOUR = 23;
export const IRAN_DAILY_SYNC_MINUTE = 59;

const MINUTE_MS = 60 * 1000;
const MAX_SCHEDULE_LOOKAHEAD_MINUTES = 48 * 60;

export type WakaTimeSyncOptions = {
  store: UserRepository;
  wakatime: WakaTimeClient;
  intervalMs?: number;
  onError?: (error: unknown) => void;
};

export type WakaTimeSync = {
  start: () => void;
  stop: () => void;
  runOnce: () => Promise<void>;
  syncUser: (input: {
    id: number;
    apiKey: string;
    wakatimeTimezone?: string | null;
    bypassCache?: boolean;
  }) => Promise<void>;
};

const createTimePartsFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

const getTimePartsInTimeZone = (date: Date, formatter: Intl.DateTimeFormat) => {
  const parts = formatter.formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  if (!hour || !minute) {
    return null;
  }

  return {
    hour: Number(hour),
    minute: Number(minute)
  };
};

export const resolveNextDailyRunAt = ({
  now = new Date(),
  timeZone,
  hour,
  minute
}: {
  now?: Date;
  timeZone: string;
  hour: number;
  minute: number;
}): Date => {
  const currentMinuteStartMs = Math.floor(now.getTime() / MINUTE_MS) * MINUTE_MS;
  let formatter: Intl.DateTimeFormat;

  try {
    formatter = createTimePartsFormatter(timeZone);
  } catch {
    return new Date(currentMinuteStartMs + 24 * 60 * MINUTE_MS);
  }

  for (
    let offsetMinutes = 1;
    offsetMinutes <= MAX_SCHEDULE_LOOKAHEAD_MINUTES;
    offsetMinutes += 1
  ) {
    const candidate = new Date(currentMinuteStartMs + offsetMinutes * MINUTE_MS);
    const candidateParts = getTimePartsInTimeZone(candidate, formatter);
    if (!candidateParts) {
      continue;
    }
    if (candidateParts.hour === hour && candidateParts.minute === minute) {
      return candidate;
    }
  }

  return new Date(currentMinuteStartMs + 24 * 60 * MINUTE_MS);
};

export const createWakaTimeSync = ({
  store,
  wakatime,
  intervalMs = DEFAULT_WAKATIME_SYNC_INTERVAL_MS,
  onError
}: WakaTimeSyncOptions): WakaTimeSync => {
  let timer: NodeJS.Timeout | null = null;
  let dailyTimer: NodeJS.Timeout | null = null;
  let running = false;
  let stopped = false;

  const reportError = (error: unknown) => {
    if (onError) {
      onError(error);
      return;
    }

    // eslint-disable-next-line no-console
    console.error("[wakawars] WakaTime sync failed", error);
  };

  const resolveDateKey = (input: {
    dateKey?: string;
    timeZone?: string | null;
  }) => {
    if (input.dateKey) {
      return input.dateKey;
    }

    return toDateKeyInTimeZone(new Date(), input.timeZone ?? null);
  };

  const resolveYesterdayDateKey = (
    input: { timeZone?: string | null },
    baseDate: Date
  ) => {
    const today = toDateKeyInTimeZone(baseDate, input.timeZone ?? null);
    return shiftDateKey(today, -1);
  };

  const settleDailyRankRewards = async (baseDate: Date) => {
    const users = await store.listUsers();
    const settledAt = new Date();

    for (const listedUser of users) {
      try {
        const config = await store.getUserById(listedUser.id);
        if (!config) {
          continue;
        }

        const dateKey = resolveYesterdayDateKey(
          { timeZone: config.wakatimeTimezone ?? null },
          baseDate
        );
        const groupPeerIds = new Set(await store.getGroupPeerIds(config.id));
        const friendIds = new Set(config.friends.map((friend) => friend.id));
        const userIds = Array.from(
          new Set([config.id, ...friendIds, ...groupPeerIds])
        );
        const userRecords = await store.getUsersByIds(userIds);
        const usersById = new Map(userRecords.map((user) => [user.id, user]));
        const boardUsers = userIds
          .map((id) => usersById.get(id))
          .filter((user): user is NonNullable<typeof user> => Boolean(user));

        const dateKeyGroups = new Map<string, number[]>();
        boardUsers.forEach((user) => {
          const userDateKey = resolveYesterdayDateKey(
            { timeZone: user.wakatimeTimezone ?? null },
            baseDate
          );
          const existing = dateKeyGroups.get(userDateKey);
          if (existing) {
            existing.push(user.id);
          } else {
            dateKeyGroups.set(userDateKey, [user.id]);
          }
        });

        const dailyStats = (
          await Promise.all(
            Array.from(dateKeyGroups.entries()).map(([key, ids]) =>
              store.getDailyStats({ userIds: ids, dateKey: key })
            )
          )
        ).flat();
        const statsByUserId = new Map(dailyStats.map((stat) => [stat.userId, stat]));
        const incomingFriendIds = new Set(
          await store.getIncomingFriendIds(config.id, userIds)
        );

        const buildDailyStat = (
          user: (typeof boardUsers)[number],
          isSelf: boolean
        ): DailyStat => {
          const stat = statsByUserId.get(user.id);
          const isMutualFriend =
            friendIds.has(user.id) && incomingFriendIds.has(user.id);
          const isGroupConnected = groupPeerIds.has(user.id);
          const canView =
            isSelf ||
            user.statsVisibility === "everyone" ||
            (user.statsVisibility === "friends" &&
              (isMutualFriend || isGroupConnected));

          if (!canView) {
            return {
              username: user.wakawarsUsername,
              totalSeconds: 0,
              status: "private",
              equippedSkinId: user.equippedSkinId ?? null,
              error: null
            };
          }

          if (!stat) {
            return {
              username: user.wakawarsUsername,
              totalSeconds: 0,
              status: "error",
              equippedSkinId: user.equippedSkinId ?? null,
              error: "No stats synced yet"
            };
          }

          return {
            username: user.wakawarsUsername,
            totalSeconds: stat.totalSeconds,
            status: stat.status,
            equippedSkinId: user.equippedSkinId ?? null,
            error: stat.error ?? null
          };
        };

        const leaderboardUsers = boardUsers.filter((user) => user.isCompeting);
        const stats = leaderboardUsers.map((user) =>
          buildDailyStat(user, user.id === config.id)
        );
        const computedEntries = computeLeaderboard(stats, config.wakawarsUsername);
        const selfEntry = computedEntries.find(
          (entry) => entry.username === config.wakawarsUsername
        );
        const rank = selfEntry?.rank ?? null;
        const coinsAwarded = getDailyRankRewardCoins(rank);

        await store.settleDailyReward({
          userId: config.id,
          dateKey,
          rank,
          coinsAwarded,
          settledAt
        });
      } catch (error) {
        reportError(error);
      }
    }
  };

  const runOnceInternal = async ({
    bypassCache = false
  }: { bypassCache?: boolean } = {}) => {
    if (running) return;
    running = true;

    try {
      const users = await store.listUsers();
      const targets = users
        .map((user) => ({
          ...user,
          apiKey: user.apiKey.trim()
        }))
        .filter((user) => Boolean(user.apiKey));

      await runInBatches(
        targets,
        async (user) => {
          const dailyResult = await wakatime.getStatusBarToday("current", user.apiKey, {
            bypassCache
          });
          const resolvedTimezone =
            dailyResult.timezone ?? user.wakatimeTimezone ?? null;
          const dateKey = resolveDateKey({
            dateKey: dailyResult.dateKey,
            timeZone: resolvedTimezone
          });

          const dailyLog = store.createProviderLog({
            provider: "wakatime",
            userId: user.id,
            endpoint: "status_bar/today",
            rangeKey: null,
            statusCode: dailyResult.responseStatus ?? null,
            ok: dailyResult.responseOk ?? false,
            payload: dailyResult.payload ?? null,
            error: dailyResult.error ?? dailyResult.networkError ?? null,
            fetchedAt: new Date(dailyResult.fetchedAt)
          });

          const logTasks: Promise<unknown>[] = [];
          if (dailyResult.timezone && dailyResult.timezone !== user.wakatimeTimezone) {
            logTasks.push(store.setWakaTimeTimezone(user.id, dailyResult.timezone));
          }
          if (!dailyResult.fromCache || dailyResult.networkError) {
            logTasks.push(dailyLog);
          }

          if (!dailyResult.fromCache) {
            await store.upsertDailyStat({
              userId: user.id,
              dateKey,
              totalSeconds: dailyResult.totalSeconds,
              status: dailyResult.status,
              error: dailyResult.error ?? null,
              fetchedAt: new Date(dailyResult.fetchedAt)
            });
          }

          await awardDailyAchievements({
            store,
            userId: user.id,
            dateKey,
            status: dailyResult.status,
            totalSeconds: dailyResult.totalSeconds,
            payload: dailyResult.payload,
            fetchedAt: new Date(dailyResult.fetchedAt)
          });

          if (logTasks.length) {
            await Promise.allSettled(logTasks);
          }
        },
        {
          batchSize: DEFAULT_WAKATIME_BATCH_SIZE,
          delayMs: DEFAULT_WAKATIME_BATCH_DELAY_MS,
          onError: reportError
        }
      );

      await settleDailyRankRewards(new Date());
    } catch (error) {
      reportError(error);
    } finally {
      running = false;
    }
  };

  const runOnce = async () => {
    await runOnceInternal();
  };

  const syncUser = async ({
    id,
    apiKey,
    wakatimeTimezone,
    bypassCache = false
  }: {
    id: number;
    apiKey: string;
    wakatimeTimezone?: string | null;
    bypassCache?: boolean;
  }) => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      return;
    }

    try {
      const dailyResult = await wakatime.getStatusBarToday("current", trimmedKey, {
        bypassCache
      });
      const resolvedTimezone = dailyResult.timezone ?? wakatimeTimezone ?? null;
      const dateKey = resolveDateKey({
        dateKey: dailyResult.dateKey,
        timeZone: resolvedTimezone
      });

      const dailyLog = store.createProviderLog({
        provider: "wakatime",
        userId: id,
        endpoint: "status_bar/today",
        rangeKey: null,
        statusCode: dailyResult.responseStatus ?? null,
        ok: dailyResult.responseOk ?? false,
        payload: dailyResult.payload ?? null,
        error: dailyResult.error ?? dailyResult.networkError ?? null,
        fetchedAt: new Date(dailyResult.fetchedAt)
      });

      const logTasks: Promise<unknown>[] = [];
      if (dailyResult.timezone && dailyResult.timezone !== wakatimeTimezone) {
        logTasks.push(store.setWakaTimeTimezone(id, dailyResult.timezone));
      }
      if (!dailyResult.fromCache || dailyResult.networkError) {
        logTasks.push(dailyLog);
      }

      if (!dailyResult.fromCache) {
        await store.upsertDailyStat({
          userId: id,
          dateKey,
          totalSeconds: dailyResult.totalSeconds,
          status: dailyResult.status,
          error: dailyResult.error ?? null,
          fetchedAt: new Date(dailyResult.fetchedAt)
        });
      }

      await awardDailyAchievements({
        store,
        userId: id,
        dateKey,
        status: dailyResult.status,
        totalSeconds: dailyResult.totalSeconds,
        payload: dailyResult.payload,
        fetchedAt: new Date(dailyResult.fetchedAt)
      });

      if (logTasks.length) {
        await Promise.allSettled(logTasks);
      }
    } catch (error) {
      reportError(error);
    }
  };

  const scheduleDailyIranSync = () => {
    if (dailyTimer || stopped) {
      return;
    }

    const nextRunAt = resolveNextDailyRunAt({
      timeZone: IRAN_DAILY_SYNC_TIME_ZONE,
      hour: IRAN_DAILY_SYNC_HOUR,
      minute: IRAN_DAILY_SYNC_MINUTE
    });
    const delayMs = Math.max(nextRunAt.getTime() - Date.now(), 1000);

    dailyTimer = setTimeout(() => {
      dailyTimer = null;
      void runOnceInternal({ bypassCache: true }).finally(() => {
        scheduleDailyIranSync();
      });
    }, delayMs);
  };

  const start = () => {
    if (timer) return;
    stopped = false;
    void runOnce();
    timer = setInterval(() => {
      void runOnce();
    }, intervalMs);
    scheduleDailyIranSync();
  };

  const stop = () => {
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (dailyTimer) {
      clearTimeout(dailyTimer);
      dailyTimer = null;
    }
  };

  return { start, stop, runOnce, syncUser };
};
