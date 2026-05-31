import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  formatDuration,
  computeLeaderboard,
  sliceLeaderboard,
  type DailyHistoryResponse,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type PublicConfig,
  type ShopCatalogResponse,
  type SkinId,
  type WalletResponse,
  type WeeklyLeaderboardEntry,
  type WeeklyLeaderboardResponse,
} from "@molty/shared";

const logoUrl = new URL("./assets/logo.svg", import.meta.url).toString();
const logoMaskStyle = { "--logo-mask": `url(${logoUrl})` } as CSSProperties;
const appVersion = __APP_VERSION__;

const initialOnboardingState = { wakawarsUsername: "", apiKey: "" };
const initialLoginState = { username: "", password: "" };
const initialPasswordState = { password: "", confirm: "" };

type SessionState = {
  authenticated: boolean;
  passwordSet: boolean;
  wakawarsUsername?: string;
  hasUser: boolean;
};

type VersionPayload = {
  version?: string;
  buildTime?: string;
};

type UserAchievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  count: number;
  firstAwardedAt: string;
  lastAwardedAt: string;
};

type UserAchievementsPayload = {
  username: string;
  totalUnlocks: number;
  achievements: UserAchievement[];
};

type AchievementCatalogItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  count: number;
  unlocked: boolean;
  firstAwardedAt: string | null;
  lastAwardedAt: string | null;
};

type AchievementCatalogPayload = {
  username: string;
  totalUnlocks: number;
  unlockedCount: number;
  totalDefined: number;
  achievements: AchievementCatalogItem[];
};

type AchievementRarity = "common" | "rare" | "epic" | "legendary";

const COMMON_ACHIEVEMENT_IDS = new Set([
  "quick-boot-4h",
  "focus-reactor-6h",
  "weekend-warrior-8h",
  "workweek-warrior-40h",
  "seven-sunrise-week",
]);

const EPIC_ACHIEVEMENT_IDS = new Set([
  "merge-mountain-12h",
  "night-shift-14h",
  "green-wall-80h",
  "project-monolith-80h",
]);

const LEGENDARY_ACHIEVEMENT_IDS = new Set([
  "legendary-commit-16h",
  "boss-raid-20h",
  "graph-overflow-100h",
  "matrix-120h",
  "ultra-pace-10h",
]);

const getAchievementRarity = (achievementId: string): AchievementRarity => {
  if (LEGENDARY_ACHIEVEMENT_IDS.has(achievementId)) return "legendary";
  if (EPIC_ACHIEVEMENT_IDS.has(achievementId)) return "epic";
  if (COMMON_ACHIEVEMENT_IDS.has(achievementId)) return "common";
  return "rare";
};

const AchievementHeaderIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 4h8v2a4 4 0 0 1-8 0V4Z" />
    <path d="M8 5H5a3 3 0 0 0 3 3" />
    <path d="M16 5h3a3 3 0 0 1-3 3" />
    <path d="M12 10v3" />
    <path d="M9.5 16h5" />
    <path d="M8.5 19h7" />
  </svg>
);

const HomeHeaderIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M6.5 10.5V20h11v-9.5" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

type PanelProps = {
  className?: string;
  children: ReactNode;
};

const Panel = ({ className, children }: PanelProps) => {
  return (
    <section
      className={className ? `panel ${className}` : "panel"}
    >
      {children}
    </section>
  );
};

type ViewProps = {
  viewKey: string;
  children: ReactNode;
};

const View = ({ viewKey, children }: ViewProps) => {
  return (
    <div
      key={viewKey}
      className="view-stack"
    >
      {children}
    </div>
  );
};

type ButtonProps = ComponentPropsWithoutRef<"button">;

const Button = ({
  children,
  disabled,
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
const ShopHeaderIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6.5 8h11l-1 11h-9l-1-11Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

const CoinIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="coin-icon"
  >
    <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.18" />
    <circle
      cx="12"
      cy="12"
      r="7.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

type AddFriendCardProps = {
  docked?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  friendInput: string;
  onFriendInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  errorMessage?: string | null;
};

const AddFriendCard = ({
  docked,
  dismissible,
  onDismiss,
  friendInput,
  onFriendInputChange,
  onSubmit,
  loading,
  errorMessage,
}: AddFriendCardProps) => (
  <Panel className={`add-friend-card ${docked ? "add-friend-dock" : ""}`}>
    <div className="panel-head">
      <div>
        <p className="eyebrow">Recruit</p>
        <h2>Draft a rival into your arena</h2>
        <p className="muted">Use their WakaTime username to sync stats.</p>
      </div>
      {dismissible && (
        <Button
          type="button"
          className="icon-button small dismiss-button"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          x
        </Button>
      )}
    </div>
    <form className="input-row" onSubmit={onSubmit}>
      <input
        type="text"
        value={friendInput}
        onChange={(event) => onFriendInputChange(event.target.value)}
        placeholder="rival-username"
        disabled={loading}
      />
      <Button className="primary" type="submit" disabled={loading}>
        Recruit
      </Button>
    </form>
    <>
      {errorMessage && (
        <p
          className="form-error"
        >
          {errorMessage}
        </p>
      )}
    </>
  </Panel>
);

const App = () => {
  const [apiBase, setApiBase] = useState<string | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [stats, setStats] = useState<LeaderboardResponse | null>(null);
  const [yesterdayStats, setYesterdayStats] =
    useState<LeaderboardResponse | null>(null);
  const [dailyHistory, setDailyHistory] =
    useState<DailyHistoryResponse | null>(null);
  const [weeklyStats, setWeeklyStats] =
    useState<WeeklyLeaderboardResponse | null>(null);
  const [competitionState, setCompetitionState] = useState<boolean | null>(null);
  const [dailyEntries, setDailyEntries] = useState<LeaderboardEntry[]>([]);
  const [selfDailyEntry, setSelfDailyEntry] =
    useState<LeaderboardEntry | null>(null);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyLeaderboardEntry[]>(
    []
  );
  const [selfWeeklyEntry, setSelfWeeklyEntry] =
    useState<WeeklyLeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() =>
    localStorage.getItem("wakawarsSession")
  );
  const [session, setSession] = useState<SessionState | null>(null);
  const [onboarding, setOnboarding] = useState(initialOnboardingState);
  const [login, setLogin] = useState(initialLoginState);
  const [passwordForm, setPasswordForm] = useState(initialPasswordState);
  const [usernameInput, setUsernameInput] = useState("");
  const [friendInput, setFriendInput] = useState("");
  const [addFriendError, setAddFriendError] = useState<string | null>(null);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupMemberInputs, setGroupMemberInputs] = useState<
    Record<number, string>
  >({});
  const [activeTab, setActiveTab] = useState<
    "league" | "shop" | "achievements" | "settings"
  >("league");
  const [activeLeagueTab, setActiveLeagueTab] = useState<"today" | "weekly">(
    "today"
  );
  const [authView, setAuthView] = useState<"welcome" | "signin" | "signup">(
    "welcome"
  );
  const authViewInitialized = useRef(false);
  const [showDockedAddFriend, setShowDockedAddFriend] = useState(() => {
    const stored = localStorage.getItem("wakawarsHideDockedAdd");
    return stored !== "true";
  });
  const [launchAtLogin, setLaunchAtLogin] = useState<boolean | null>(null);
  const [launchAtLoginStatus, setLaunchAtLoginStatus] = useState<string | null>(
    null
  );
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem("wakawarsTheme");
    if (stored === "light" || stored === "dark") return stored;
    const prefersLight = window.matchMedia?.(
      "(prefers-color-scheme: light)"
    )?.matches;
    if (prefersLight) {
      return "light";
    }
    return "dark";
  });
  const [menuBarTimeEnabled, setMenuBarTimeEnabled] = useState(() => {
    const supported =
      typeof window !== "undefined" && Boolean(window.molty?.setTrayTitle);
    if (!supported) return false;
    const stored = localStorage.getItem("wakawarsMenuBarTime");
    if (stored === "true") return true;
    if (stored === "false") return false;
    return true;
  });
  const [menuBarRankEnabled, setMenuBarRankEnabled] = useState(() => {
    const stored = localStorage.getItem("wakawarsMenuBarRank");
    if (stored === "true") return true;
    if (stored === "false") return false;
    return false;
  });
  const [appSkinsEnabled, setAppSkinsEnabled] = useState(() => {
    const stored = localStorage.getItem("wakawarsAppSkins");
    if (stored === "true") return true;
    if (stored === "false") return false;
    return true;
  });
  const [hoveredUsername, setHoveredUsername] = useState<string | null>(null);
  const [userAchievements, setUserAchievements] = useState<
    Record<
      string,
      { loading: boolean; data: UserAchievementsPayload | null; error: string | null }
    >
  >({});
  const [achievementCatalog, setAchievementCatalog] =
    useState<AchievementCatalogPayload | null>(null);
  const [achievementCatalogLoading, setAchievementCatalogLoading] =
    useState(false);
  const [achievementCatalogError, setAchievementCatalogError] = useState<
    string | null
  >(null);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [shopCatalog, setShopCatalog] = useState<ShopCatalogResponse | null>(
    null
  );
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [shopPendingSkinId, setShopPendingSkinId] = useState<SkinId | null>(
    null
  );

  const isAuthenticated = Boolean(session?.authenticated);
  const isConfigured = Boolean(config?.wakawarsUsername && config?.hasApiKey);
  const shouldIncludeWeekly =
    activeLeagueTab === "weekly" || Boolean(weeklyStats);
  const menuBarTimeSupported =
    typeof window !== "undefined" && Boolean(window.molty?.setTrayTitle);
  const lastDailySelfIndexRef = useRef<number | null>(null);
  const lastWeeklySelfIndexRef = useRef<number | null>(null);
  const loadStatsAbortRef = useRef<AbortController | null>(null);
  const loadStatsSeqRef = useRef(0);
  const competitionPendingRef = useRef(false);
  const competitionRequestAbortRef = useRef<AbortController | null>(null);
  const competitionDebounceRef = useRef<number | null>(null);
  const competitionRequestIdRef = useRef(0);
  const achievementsModalRef = useRef<HTMLElement | null>(null);
  const competitionRollbackRef = useRef<{
    previousConfig: PublicConfig | null;
    previousStats: LeaderboardResponse | null;
    previousWeeklyStats: WeeklyLeaderboardResponse | null;
    previousDailyEntries: LeaderboardEntry[];
    previousWeeklyEntries: WeeklyLeaderboardEntry[];
    previousSelfDailyEntry: LeaderboardEntry | null;
    previousSelfWeeklyEntry: WeeklyLeaderboardEntry | null;
  } | null>(null);

  const request = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      if (!apiBase) {
        throw new Error("Network error. Please try again.");
      }

      try {
        const response = await fetch(`${apiBase}${path}`, {
          ...options,
          headers: {
            "content-type": "application/json",
            ...(sessionId ? { "x-wakawars-session": sessionId } : {}),
            ...(options?.headers || {}),
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            payload?.error || `Request failed (${response.status})`;
          throw new Error(message);
        }

        return response.json() as Promise<T>;
      } catch (error) {
        if (error instanceof TypeError) {
          throw new Error("Network error. Please try again.");
        }
        throw error;
      }
    },
    [apiBase, sessionId]
  );

  const checkForUpdates = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const base = import.meta.env.BASE_URL ?? "/";
      const normalizedBase = base.endsWith("/") ? base : `${base}/`;
      const versionUrl = new URL(
        `${normalizedBase}version.json`,
        window.location.origin
      );
      versionUrl.searchParams.set("t", String(Date.now()));
      const response = await fetch(versionUrl.toString(), { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as VersionPayload;
      if (!payload?.version) return;
      if (payload.version !== appVersion) {
        setUpdateAvailable(true);
        setLatestVersion(payload.version);
      } else {
        setUpdateAvailable(false);
        setLatestVersion(null);
      }
    } catch {
      // Ignore version check failures.
    }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const payload = await request<SessionState>("/session");
      setSession(payload);
      if (!payload.authenticated) {
        setSessionId(null);
        localStorage.removeItem("wakawarsSession");
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    }
  }, [request]);

  const loadConfig = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const payload = await request<PublicConfig>("/config");
      setConfig(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    }
  }, [isAuthenticated, request]);

  const loadStats = useCallback(
    async ({
      silent = false,
      includeWeekly = false,
    }: {
      silent?: boolean;
      includeWeekly?: boolean;
    } = {}) => {
      if (!isConfigured || !isAuthenticated) return;
      if (
        competitionPendingRef.current &&
        competitionState !== null &&
        config &&
        competitionState !== config.isCompeting
      ) {
        loadStatsAbortRef.current?.abort();
        return;
      }
      loadStatsAbortRef.current?.abort();
      const controller = new AbortController();
      loadStatsAbortRef.current = controller;
      const requestId = ++loadStatsSeqRef.current;
      if (!silent) {
        setLoading(true);
      }
      try {
        const tasks: Array<
          Promise<
            LeaderboardResponse | WeeklyLeaderboardResponse | DailyHistoryResponse
          >
        > = [
          request<LeaderboardResponse>("/stats/today", {
            signal: controller.signal,
          }),
          request<LeaderboardResponse>("/stats/yesterday", {
            signal: controller.signal,
          }),
          request<DailyHistoryResponse>("/stats/history", {
            signal: controller.signal,
          }),
        ];

        if (includeWeekly) {
          tasks.push(
            request<WeeklyLeaderboardResponse>("/stats/weekly", {
              signal: controller.signal,
            })
          );
        }

        const results = await Promise.allSettled(tasks);
        if (controller.signal.aborted || loadStatsSeqRef.current !== requestId) {
          return;
        }
        let nextError: string | null = null;

        const dailyResult = results[0];
        if (dailyResult.status === "fulfilled") {
          const payload = dailyResult.value as LeaderboardResponse;
          setStats(payload);
          setDailyEntries(payload.entries);
          const nextSelf =
            payload.selfEntry ??
            payload.entries.find(
              (entry) => entry.username === config?.wakawarsUsername
            ) ??
            null;
          setSelfDailyEntry(nextSelf);
        } else {
          if (dailyResult.reason?.name !== "AbortError") {
            nextError =
              dailyResult.reason instanceof Error
                ? dailyResult.reason.message
                : "Failed to load stats";
          }
        }

        const yesterdayResult = results[1];
        if (yesterdayResult?.status === "fulfilled") {
          setYesterdayStats(yesterdayResult.value as LeaderboardResponse);
        }
        const historyResult = results[2];
        if (historyResult?.status === "fulfilled") {
          setDailyHistory(historyResult.value as DailyHistoryResponse);
        } else if (historyResult?.status === "rejected") {
          if (historyResult.reason?.name !== "AbortError") {
            if (!nextError) {
              nextError =
                historyResult.reason instanceof Error
                  ? historyResult.reason.message
                  : "Failed to load history stats";
            }
          }
        }

        if (includeWeekly) {
          const weeklyResult = results[3];
          if (weeklyResult?.status === "fulfilled") {
            const payload = weeklyResult.value as WeeklyLeaderboardResponse;
            setWeeklyStats(payload);
            setWeeklyEntries(payload.entries);
            const nextSelf =
              payload.selfEntry ??
              payload.entries.find(
                (entry) => entry.username === config?.wakawarsUsername
              ) ??
              null;
            setSelfWeeklyEntry(nextSelf);
          } else if (weeklyResult?.status === "rejected") {
            if (activeLeagueTab === "weekly") {
              if (weeklyResult.reason?.name !== "AbortError") {
                nextError =
                  weeklyResult.reason instanceof Error
                    ? weeklyResult.reason.message
                    : "Failed to load weekly stats";
              }
            }
          }
        }

        if (loadStatsSeqRef.current === requestId) {
          setError(nextError);
        }
      } finally {
        if (!silent && loadStatsSeqRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [
      isConfigured,
      isAuthenticated,
      request,
      activeLeagueTab,
      config?.wakawarsUsername,
      config?.isCompeting,
      competitionState,
    ]
  );

  useEffect(() => {
    const envBase = import.meta.env.VITE_API_BASE as string | undefined;
    if (envBase) {
      setApiBase(envBase);
      return;
    }

    if (window.molty?.getApiBase) {
      window.molty
        .getApiBase()
        .then((base) => setApiBase(base))
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Network error")
        );
      return;
    }

    const defaultBase = import.meta.env.DEV
      ? "http://localhost:3000/wakawars/v0"
      : "https://core.molty.cool/wakawars/v0";
    setApiBase(defaultBase);
  }, []);

  useEffect(() => {
    if (!config) return;
    if (competitionPendingRef.current) {
      if (competitionState !== null && competitionState !== config.isCompeting) {
        return;
      }
      competitionPendingRef.current = false;
    }
    setCompetitionState(config.isCompeting);
  }, [config?.isCompeting, competitionState]);

  useEffect(() => {
    if (!window.molty?.getLoginItemSettings) return;
    window.molty
      .getLoginItemSettings()
      .then((settings) => {
        setLaunchAtLogin(settings.openAtLogin);
        setLaunchAtLoginStatus(settings.status ?? null);
      })
      .catch(() => {
        setLaunchAtLogin(null);
        setLaunchAtLoginStatus(null);
      });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("wakawarsTheme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      "wakawarsMenuBarTime",
      menuBarTimeEnabled ? "true" : "false"
    );
  }, [menuBarTimeEnabled]);

  useEffect(() => {
    localStorage.setItem(
      "wakawarsMenuBarRank",
      menuBarRankEnabled ? "true" : "false"
    );
  }, [menuBarRankEnabled]);

  useEffect(() => {
    localStorage.setItem(
      "wakawarsAppSkins",
      appSkinsEnabled ? "true" : "false"
    );
  }, [appSkinsEnabled]);

  useEffect(() => {
    checkForUpdates();
    const intervalId = window.setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [checkForUpdates]);

  useEffect(() => {
    if (!apiBase) return;
    loadSession();
  }, [apiBase, loadSession]);

  useEffect(() => {
    if (!session) return;
    if (session.authenticated) {
      loadConfig();
    }
  }, [session, loadConfig]);

  useEffect(() => {
    if (!isConfigured || !isAuthenticated) return;
    loadStats({ includeWeekly: shouldIncludeWeekly });
  }, [isConfigured, isAuthenticated, shouldIncludeWeekly, loadStats]);

  useEffect(() => {
    if (!isConfigured || !isAuthenticated) return;
    const intervalId = window.setInterval(() => {
      loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
    }, 15 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [isConfigured, isAuthenticated, shouldIncludeWeekly, loadStats]);

  useEffect(() => {
    if (session?.wakawarsUsername && !login.username) {
      setLogin((prev) => ({
        ...prev,
        username: session.wakawarsUsername ?? prev.username,
      }));
    }
  }, [session?.wakawarsUsername, login.username]);

  useEffect(() => {
    setUsernameInput(config?.wakawarsUsername ?? "");
  }, [config?.wakawarsUsername]);

  useEffect(() => {
    if (!session || authViewInitialized.current) return;
    if (session.hasUser && !session.authenticated) {
      setAuthView("signin");
    } else {
      setAuthView("welcome");
    }
    authViewInitialized.current = true;
  }, [session]);

  const handleOnboardingSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = await request<{
        sessionId?: string;
        config: PublicConfig;
      }>("/config", {
        method: "POST",
        body: JSON.stringify(onboarding),
      });
      setConfig(payload.config);
      if (payload.sessionId) {
        setSessionId(payload.sessionId);
        localStorage.setItem("wakawarsSession", payload.sessionId);
        setSession({
          authenticated: true,
          passwordSet: false,
          wakawarsUsername: payload.config.wakawarsUsername,
          hasUser: true,
        });
      }
      setOnboarding(initialOnboardingState);
      setError(null);
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = await request<{
        sessionId: string;
        wakawarsUsername: string;
        passwordSet: boolean;
      }>("/session/login", {
        method: "POST",
        body: JSON.stringify({
          username: login.username,
          password: login.password,
        }),
      });
      setSessionId(payload.sessionId);
      localStorage.setItem("wakawarsSession", payload.sessionId);
      setSession({
        authenticated: true,
        passwordSet: payload.passwordSet,
        wakawarsUsername: payload.wakawarsUsername,
        hasUser: true,
      });
      setLogin(initialLoginState);
      setError(null);
      await loadConfig();
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (passwordForm.password !== passwordForm.confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await request<{ passwordSet: boolean }>("/password", {
        method: "POST",
        body: JSON.stringify({ password: passwordForm.password }),
      });
      setSession((prev) =>
        prev
          ? {
              ...prev,
              authenticated: true,
              passwordSet: true,
              hasUser: true,
            }
          : prev
      );

      setPasswordForm(initialPasswordState);
      await loadConfig();
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameUpdate = async (event: FormEvent) => {
    event.preventDefault();
    const wakawarsUsername = usernameInput.trim().toLowerCase();
    if (!wakawarsUsername) {
      setError("WakaWars username is required");
      return;
    }

    if (config?.wakawarsUsername === wakawarsUsername) {
      return;
    }

    setLoading(true);
    try {
      const payload = await request<PublicConfig>("/username", {
        method: "POST",
        body: JSON.stringify({ wakawarsUsername }),
      });
      setConfig(payload);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              wakawarsUsername: payload.wakawarsUsername,
            }
          : prev
      );
      setLogin((prev) => ({ ...prev, username: payload.wakawarsUsername }));
      setError(null);
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update username"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (event: FormEvent) => {
    event.preventDefault();
    if (!friendInput.trim()) return;

    setLoading(true);
    setAddFriendError(null);
    try {
      const payload = await request<PublicConfig>("/friends", {
        method: "POST",
        body: JSON.stringify({
          username: friendInput.trim(),
        }),
      });
      setConfig(payload);
      setFriendInput("");
      setError(null);
      setAddFriendError(null);
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add friend";
      if (message === "Friend not found") {
        setAddFriendError(message);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchToggle = async (nextValue: boolean) => {
    const previousValue = launchAtLogin;
    setLaunchAtLogin(nextValue);
    if (!window.molty?.setLoginItemSettings) {
      return;
    }

    try {
      const settings = await window.molty.setLoginItemSettings(nextValue);
      setLaunchAtLogin(settings.openAtLogin);
      setLaunchAtLoginStatus(settings.status ?? null);
    } catch {
      setLaunchAtLogin(previousValue);
      setLaunchAtLoginStatus(null);
      setError("Unable to update settings.");
    }
  };

  const handleRemoveFriend = async (username: string) => {
    if (!username) return;
    setLoading(true);
    try {
      const payload = await request<PublicConfig>(
        `/friends/${encodeURIComponent(username)}`,
        {
          method: "DELETE",
        }
      );
      setConfig(payload);
      setError(null);
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove friend");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = groupNameInput.trim();
    if (!name) return;

    setLoading(true);
    try {
      const payload = await request<PublicConfig>("/groups", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setConfig(payload);
      setGroupNameInput("");
      setError(null);
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!groupId) return;

    setLoading(true);
    try {
      const payload = await request<PublicConfig>(
        `/groups/${encodeURIComponent(String(groupId))}`,
        { method: "DELETE" }
      );
      setConfig(payload);
      setError(null);
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroupMember = async (
    event: FormEvent<HTMLFormElement>,
    groupId: number
  ) => {
    event.preventDefault();
    const value = groupMemberInputs[groupId]?.trim();
    if (!value) return;

    setLoading(true);
    try {
      const payload = await request<PublicConfig>(
        `/groups/${encodeURIComponent(String(groupId))}/members`,
        {
          method: "POST",
          body: JSON.stringify({ username: value }),
        }
      );
      setConfig(payload);
      setGroupMemberInputs((prev) => ({ ...prev, [groupId]: "" }));
      setError(null);
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add group member"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGroupMember = async (groupId: number, username: string) => {
    if (!groupId || !username) return;

    setLoading(true);
    try {
      const payload = await request<PublicConfig>(
        `/groups/${encodeURIComponent(
          String(groupId)
        )}/members/${encodeURIComponent(username)}`,
        { method: "DELETE" }
      );
      setConfig(payload);
      setError(null);
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove group member"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityChange = async (
    value: PublicConfig["statsVisibility"]
  ) => {
    if (!config || config.statsVisibility === value) return;

    setLoading(true);
    try {
      const payload = await request<PublicConfig>("/visibility", {
        method: "POST",
        body: JSON.stringify({ visibility: value }),
      });
      setConfig(payload);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update visibility"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitionToggle = async () => {
    if (!config) return;
    loadStatsAbortRef.current?.abort();
    competitionPendingRef.current = true;
    const nextValue =
      competitionState === null ? !config.isCompeting : !competitionState;
    const selfUsername = config.wakawarsUsername;
    const dailySelfIndex = dailyEntries.findIndex(
      (entry) => entry.username === selfUsername
    );
    const fallbackDailyEntry =
      selfDailyEntry ??
      stats?.selfEntry ??
      stats?.entries.find((entry) => entry.username === selfUsername) ??
      null;
    const dailySelfEntry =
      dailySelfIndex >= 0 ? dailyEntries[dailySelfIndex] : fallbackDailyEntry;
    const weeklySelfIndex = weeklyEntries.findIndex(
      (entry) => entry.username === selfUsername
    );
    const fallbackWeeklyEntry =
      selfWeeklyEntry ??
      weeklyStats?.selfEntry ??
      weeklyStats?.entries.find((entry) => entry.username === selfUsername) ??
      null;
    const weeklySelfEntry =
      weeklySelfIndex >= 0 ? weeklyEntries[weeklySelfIndex] : fallbackWeeklyEntry;

    competitionRollbackRef.current = {
      previousConfig: config,
      previousStats: stats,
      previousWeeklyStats: weeklyStats,
      previousDailyEntries: dailyEntries,
      previousWeeklyEntries: weeklyEntries,
      previousSelfDailyEntry: selfDailyEntry,
      previousSelfWeeklyEntry: selfWeeklyEntry,
    };
    setCompetitionState(nextValue);

    const recomputeEntries = <T extends LeaderboardEntry | WeeklyLeaderboardEntry>(
      entries: T[]
    ): T[] => computeLeaderboard(entries, selfUsername) as T[];

    if (!nextValue) {
      if (dailySelfIndex >= 0) {
        lastDailySelfIndexRef.current = dailySelfIndex;
      }
      if (weeklySelfIndex >= 0) {
        lastWeeklySelfIndexRef.current = weeklySelfIndex;
      }

      const nextDailyEntries = recomputeEntries(
        dailyEntries.filter((entry) => entry.username !== selfUsername)
      );
      const nextWeeklyEntries = recomputeEntries(
        weeklyEntries.filter((entry) => entry.username !== selfUsername)
      );

      setDailyEntries(nextDailyEntries);
      setWeeklyEntries(nextWeeklyEntries);

      if (dailySelfEntry) {
        setSelfDailyEntry(dailySelfEntry);
      }
      if (weeklySelfEntry) {
        setSelfWeeklyEntry(weeklySelfEntry);
      }

      setStats((prev) =>
        prev
          ? {
              ...prev,
              entries: nextDailyEntries,
              selfEntry: dailySelfEntry ?? prev.selfEntry ?? null,
            }
          : prev
      );
      setWeeklyStats((prev) =>
        prev
          ? {
              ...prev,
              entries: nextWeeklyEntries,
              selfEntry: weeklySelfEntry ?? prev.selfEntry ?? null,
            }
          : prev
      );
    } else {
      if (dailySelfEntry) {
        const hasSelf = dailyEntries.some(
          (entry) => entry.username === selfUsername
        );
        const nextDailyEntries = recomputeEntries(
          hasSelf ? dailyEntries : [...dailyEntries, dailySelfEntry]
        );
        const updatedSelf = nextDailyEntries.find(
          (entry) => entry.username === selfUsername
        );
        if (updatedSelf) {
          setSelfDailyEntry(updatedSelf);
          lastDailySelfIndexRef.current = nextDailyEntries.findIndex(
            (entry) => entry.username === selfUsername
          );
        }
        setDailyEntries(nextDailyEntries);
        setStats((prev) =>
          prev
            ? {
                ...prev,
                entries: nextDailyEntries,
                selfEntry: updatedSelf ?? prev.selfEntry ?? dailySelfEntry,
              }
            : prev
        );
      }
      if (weeklySelfEntry) {
        const hasSelf = weeklyEntries.some(
          (entry) => entry.username === selfUsername
        );
        const nextWeeklyEntries = recomputeEntries(
          hasSelf ? weeklyEntries : [...weeklyEntries, weeklySelfEntry]
        );
        const updatedSelf = nextWeeklyEntries.find(
          (entry) => entry.username === selfUsername
        );
        if (updatedSelf) {
          setSelfWeeklyEntry(updatedSelf);
          lastWeeklySelfIndexRef.current = nextWeeklyEntries.findIndex(
            (entry) => entry.username === selfUsername
          );
        }
        setWeeklyEntries(nextWeeklyEntries);
        setWeeklyStats((prev) =>
          prev
            ? {
                ...prev,
                entries: nextWeeklyEntries,
                selfEntry: updatedSelf ?? prev.selfEntry ?? weeklySelfEntry,
              }
            : prev
        );
      }
    }
  };

  const handleRetry = () => {
    setError(null);
    loadSession();
    loadConfig();
    loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
  };

  const handleRefresh = useCallback(async () => {
    if (!isConfigured || !isAuthenticated || refreshing) return;
    setRefreshing(true);
    try {
      await request<LeaderboardResponse>("/stats/refresh", { method: "POST" });
      await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh stats");
    } finally {
      setRefreshing(false);
    }
  }, [
    isConfigured,
    isAuthenticated,
    refreshing,
    request,
    loadStats,
    shouldIncludeWeekly,
  ]);

  const loadAchievementCatalog = useCallback(
    async (force = false) => {
      if (!isAuthenticated || !isConfigured) return;
      if (achievementCatalogLoading) return;
      if (achievementCatalog && !force) return;

      setAchievementCatalogLoading(true);
      setAchievementCatalogError(null);
      try {
        const payload = await request<AchievementCatalogPayload>("/achievements");
        setAchievementCatalog(payload);
      } catch (err) {
        setAchievementCatalogError(
          err instanceof Error ? err.message : "Failed to load achievements"
        );
      } finally {
        setAchievementCatalogLoading(false);
      }
    },
    [
      isAuthenticated,
      isConfigured,
      achievementCatalogLoading,
      achievementCatalog,
      request,
    ]
  );

  const openAchievementsPage = useCallback(() => {
    setActiveTab("achievements");
    void loadAchievementCatalog(false);
  }, [loadAchievementCatalog]);

  const loadEconomy = useCallback(
    async (silent = false) => {
      if (!isAuthenticated || !isConfigured) return;

      if (!silent) {
        setShopLoading(true);
      }
      setShopError(null);

      try {
        const [walletPayload, shopPayload] = await Promise.all([
          request<WalletResponse>("/wallet"),
          request<ShopCatalogResponse>("/shop/skins"),
        ]);
        setWallet(walletPayload);
        setShopCatalog(shopPayload);
      } catch (err) {
        setShopError(
          err instanceof Error ? err.message : "Failed to load shop"
        );
      } finally {
        if (!silent) {
          setShopLoading(false);
        }
      }
    },
    [isAuthenticated, isConfigured, request]
  );

  useEffect(() => {
    if (!isConfigured || !isAuthenticated) return;
    void loadEconomy(true);
  }, [isConfigured, isAuthenticated, loadEconomy]);

  useEffect(() => {
    if (isConfigured && isAuthenticated) return;
    setWallet(null);
    setShopCatalog(null);
    setShopError(null);
    setShopPendingSkinId(null);
  }, [isConfigured, isAuthenticated]);

  const handlePurchaseSkin = useCallback(
    async (skinId: SkinId) => {
      setShopPendingSkinId(skinId);
      try {
        const payload = await request<ShopCatalogResponse>(
          `/shop/skins/${encodeURIComponent(skinId)}/purchase`,
          { method: "POST" }
        );
        setShopCatalog(payload);
        setError(null);
        setShopError(null);
        await loadEconomy(true);
        await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
      } catch (err) {
        setShopError(err instanceof Error ? err.message : "Purchase failed");
      } finally {
        setShopPendingSkinId(null);
      }
    },
    [loadEconomy, loadStats, request, shouldIncludeWeekly]
  );

  const handleEquipSkin = useCallback(
    async (skinId: SkinId) => {
      setShopPendingSkinId(skinId);
      try {
        const payload = await request<ShopCatalogResponse>(
          `/shop/skins/${encodeURIComponent(skinId)}/equip`,
          { method: "POST" }
        );
        setShopCatalog(payload);
        setError(null);
        setShopError(null);
        await loadEconomy(true);
        await loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
      } catch (err) {
        setShopError(err instanceof Error ? err.message : "Equip failed");
      } finally {
        setShopPendingSkinId(null);
      }
    },
    [loadEconomy, loadStats, request, shouldIncludeWeekly]
  );

  const fetchUserAchievements = useCallback(
    async (username: string, force = false) => {
      const normalized = username.trim().toLowerCase();
      if (!normalized) return;

      const existing = userAchievements[normalized];
      if (!force && (existing?.loading || existing?.data)) return;

      setUserAchievements((prev) => ({
        ...prev,
        [normalized]: {
          loading: true,
          data: prev[normalized]?.data ?? null,
          error: null,
        },
      }));

      try {
        const payload = await request<UserAchievementsPayload>(
          `/achievements/${encodeURIComponent(normalized)}`
        );
        setUserAchievements((prev) => ({
          ...prev,
          [normalized]: {
            loading: false,
            data: payload,
            error: null,
          },
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load achievements";
        setUserAchievements((prev) => ({
          ...prev,
          [normalized]: {
            loading: false,
            data: prev[normalized]?.data ?? null,
            error: message,
          },
        }));
      }
    },
    [request, userAchievements]
  );

  const handleRowSelect = useCallback(
    (username: string) => {
      const normalized = username.trim().toLowerCase();
      if (!normalized) return;
      setHoveredUsername(normalized);
      void fetchUserAchievements(normalized);
    },
    [fetchUserAchievements]
  );

  useEffect(() => {
    if (isAuthenticated) return;
    setHoveredUsername(null);
    setUserAchievements({});
    setAchievementCatalog(null);
    setAchievementCatalogError(null);
    setAchievementCatalogLoading(false);
    setWallet(null);
    setShopCatalog(null);
    setShopError(null);
    setShopLoading(false);
    setShopPendingSkinId(null);
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === "league") return;
    setHoveredUsername(null);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "achievements") return;
    void loadAchievementCatalog(false);
  }, [activeTab, loadAchievementCatalog]);

  useEffect(() => {
    if (activeTab !== "shop") return;
    void loadEconomy(false);
  }, [activeTab, loadEconomy]);

  useEffect(() => {
    if (!hoveredUsername) return;

    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (achievementsModalRef.current?.contains(target)) return;
      if (target.closest(".row-item-trigger")) return;
      setHoveredUsername(null);
    };

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHoveredUsername(null);
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onDocumentKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [hoveredUsername]);

  useEffect(() => {
    if (!config || competitionState === null) return;
    if (competitionState === config.isCompeting) {
      competitionPendingRef.current = false;
      competitionRollbackRef.current = null;
      competitionRequestAbortRef.current?.abort();
      if (competitionDebounceRef.current) {
        window.clearTimeout(competitionDebounceRef.current);
        competitionDebounceRef.current = null;
      }
      return;
    }

    competitionPendingRef.current = true;

    if (competitionDebounceRef.current) {
      window.clearTimeout(competitionDebounceRef.current);
      competitionDebounceRef.current = null;
    }

    competitionRequestAbortRef.current?.abort();
    const controller = new AbortController();
    competitionRequestAbortRef.current = controller;

    const requestId = ++competitionRequestIdRef.current;
    competitionDebounceRef.current = window.setTimeout(() => {
      request<PublicConfig>("/competition", {
        method: "POST",
        body: JSON.stringify({ isCompeting: competitionState }),
        signal: controller.signal,
      })
        .then((payload) => {
          if (competitionRequestIdRef.current !== requestId) return;
          competitionPendingRef.current = false;
          competitionRollbackRef.current = null;
          setConfig(payload);
          setError(null);
          return loadStats({ silent: true, includeWeekly: shouldIncludeWeekly });
        })
        .catch((err) => {
          if (competitionRequestIdRef.current !== requestId) return;
          if (err?.name === "AbortError") return;
          competitionPendingRef.current = false;
          const rollback = competitionRollbackRef.current;
          if (rollback) {
            setConfig(rollback.previousConfig);
            if (rollback.previousStats) {
              setStats(rollback.previousStats);
            }
            if (rollback.previousWeeklyStats) {
              setWeeklyStats(rollback.previousWeeklyStats);
            }
            setDailyEntries(rollback.previousDailyEntries);
            setWeeklyEntries(rollback.previousWeeklyEntries);
            setSelfDailyEntry(rollback.previousSelfDailyEntry);
            setSelfWeeklyEntry(rollback.previousSelfWeeklyEntry);
            setCompetitionState(rollback.previousConfig?.isCompeting ?? null);
          }
          setError(
            err instanceof Error ? err.message : "Failed to update competition"
          );
        });
    }, 400);

    return () => {
      if (competitionDebounceRef.current) {
        window.clearTimeout(competitionDebounceRef.current);
        competitionDebounceRef.current = null;
      }
    };
  }, [competitionState, config, request, loadStats, shouldIncludeWeekly]);

  useEffect(() => {
    if (!window.molty?.onWindowOpen) return;
    const unsubscribe = window.molty.onWindowOpen(() => {
      void handleRefresh();
    });
    return unsubscribe;
  }, [handleRefresh]);

  const handleUpdate = () => {
    window.location.reload();
  };

  const lastUpdated = useMemo(() => {
    const updatedAt =
      activeLeagueTab === "weekly" ? weeklyStats?.updatedAt : stats?.updatedAt;
    if (!updatedAt) return "";
    const date = new Date(updatedAt);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [activeLeagueTab, stats?.updatedAt, weeklyStats?.updatedAt]);

  const hasStoredSession = Boolean(sessionId);
  const showMainLoading =
    hasStoredSession && (!session || (session.authenticated && !config));

  const weeklyRangeLabel = useMemo(() => {
    if (!weeklyStats?.range) return "Last 7 days";
    if (weeklyStats.range === "last_7_days") return "Last 7 days";
    if (weeklyStats.range === "this_week") return "This week";
    return weeklyStats.range.replace(/_/g, " ");
  }, [weeklyStats?.range]);

  const activeStats = activeLeagueTab === "weekly" ? weeklyStats : stats;
  const activeEntries: RowEntry[] =
    activeLeagueTab === "weekly" ? weeklyEntries : dailyEntries;

  const yesterdayPodium = useMemo(() => {
    if (!config?.wakawarsUsername || !yesterdayStats?.entries?.length) {
      return [];
    }
    return sliceLeaderboard(yesterdayStats.entries, config.wakawarsUsername, {
      podiumCount: 3,
    }).podium;
  }, [config?.wakawarsUsername, yesterdayStats?.entries]);
  const historyDays = dailyHistory?.days ?? [];

  const isCompeting = competitionState ?? config?.isCompeting ?? true;

  const menuBarTitle = useMemo(() => {
    if (!isAuthenticated || !isConfigured) return "";
    if (!selfDailyEntry || selfDailyEntry.status !== "ok") return "";
    const rankValue =
      isCompeting &&
      typeof selfDailyEntry.rank === "number" &&
      selfDailyEntry.rank > 0
        ? selfDailyEntry.rank
        : null;
    const timeLabel = menuBarTimeEnabled
      ? formatDuration(selfDailyEntry.totalSeconds)
      : null;

    if (menuBarRankEnabled && rankValue && timeLabel) {
      return `#${rankValue}: ${timeLabel}`;
    }
    if (menuBarRankEnabled && rankValue && !timeLabel) {
      return `#${rankValue}`;
    }
    if (!menuBarRankEnabled && timeLabel) {
      return timeLabel;
    }
    return "";
  }, [
    menuBarTimeEnabled,
    menuBarRankEnabled,
    isAuthenticated,
    isConfigured,
    selfDailyEntry,
    isCompeting,
  ]);

  const competitionButtonLabel = isCompeting
    ? "Leave Competition"
    : "Join Competition";
  const selfPinnedEntry =
    !isCompeting && activeLeagueTab === "weekly"
      ? selfWeeklyEntry
      : !isCompeting
        ? selfDailyEntry
        : null;
  const displayPinnedEntry = selfPinnedEntry
    ? { ...selfPinnedEntry, rank: null, deltaSeconds: 0 }
    : null;
  const hasPinnedEntry = Boolean(selfPinnedEntry);
  const pinnedUsername = selfPinnedEntry?.username ?? null;
  const activeSelfEntry =
    activeLeagueTab === "weekly" ? selfWeeklyEntry : selfDailyEntry;
  const activeInsertIndex =
    activeLeagueTab === "weekly"
      ? lastWeeklySelfIndexRef.current
      : lastDailySelfIndexRef.current;
  const listEntries = useMemo(() => {
    if (pinnedUsername) {
      return activeEntries.filter((entry) => entry.username !== pinnedUsername);
    }
    if (!isCompeting || !activeSelfEntry) return activeEntries;
    const hasSelf = activeEntries.some(
      (entry) => entry.username === activeSelfEntry.username
    );
    if (hasSelf) return activeEntries;
    const next = [...activeEntries];
    const insertIndex = activeInsertIndex ?? next.length;
    const index = Math.max(0, Math.min(insertIndex, next.length));
    next.splice(index, 0, activeSelfEntry);
    return next;
  }, [
    pinnedUsername,
    activeEntries,
    isCompeting,
    activeSelfEntry,
    activeInsertIndex,
  ]);
  const hoveredAchievementsState = hoveredUsername
    ? userAchievements[hoveredUsername] ?? {
        loading: true,
        data: null,
        error: null,
      }
    : null;
  const showHoverModal =
    Boolean(hoveredUsername) && activeTab === "league" && !showMainLoading;
  const normalizedUsernameInput = usernameInput.trim().toLowerCase();
  const canUpdateUsername =
    Boolean(normalizedUsernameInput) &&
    normalizedUsernameInput !== (config?.wakawarsUsername ?? "");
  const achievementCatalogEntries = useMemo(() => {
    const entries = achievementCatalog?.achievements ?? [];
    return [...entries].sort((a, b) => {
      if (a.unlocked !== b.unlocked) {
        return a.unlocked ? -1 : 1;
      }
      if (a.count !== b.count) {
        return b.count - a.count;
      }
      return a.title.localeCompare(b.title);
    });
  }, [achievementCatalog?.achievements]);

  useEffect(() => {
    if (!window.molty?.setTrayTitle) return;
    void window.molty.setTrayTitle(menuBarTitle);
  }, [menuBarTitle]);

  const showLogin = Boolean(session?.hasUser && !session?.authenticated);
  const showAuth = !isAuthenticated;
  const showWelcome = showAuth && authView === "welcome";
  const showSignIn = showAuth && authView === "signin";
  const showSignUp = showAuth && authView === "signup";
  const canShowControlTabs = Boolean(isConfigured && isAuthenticated);
  const showShop = Boolean(canShowControlTabs && activeTab === "shop");
  const showAchievements = Boolean(
    canShowControlTabs && activeTab === "achievements"
  );
  const showSettings = Boolean(canShowControlTabs && activeTab === "settings");
  const passwordActionLabel = "Set password";
  const headerSubtitle = useMemo(() => {
    if (showShop) return "Skin market";
    if (showAchievements) return "Trophy vault";
    if (showSettings) return "War room";
    if (showAuth) {
      if (authView === "signin") return "Sign in";
      if (authView === "signup") return "Create account";
      return "Welcome";
    }
    return activeLeagueTab === "weekly" ? "Weekly clash" : "Daily arena";
  }, [showShop, showAchievements, showSettings, showAuth, authView, activeLeagueTab]);
  const showHomeButton = Boolean(
    canShowControlTabs && (showSettings || showAchievements || showShop)
  );
  const canRefresh = Boolean(canShowControlTabs && activeTab === "league");
  const coinBalance = wallet?.coins ?? shopCatalog?.coins ?? 0;
  const updateLabel = latestVersion ? `Update v${latestVersion}` : "Update";
  const updateButton = updateAvailable ? (
    <Button
      type="button"
      className="primary update-button"
      onClick={handleUpdate}
      aria-label={
        latestVersion
          ? `Update to version ${latestVersion}`
          : "Update to the latest version"
      }
      title={
        latestVersion
          ? `Update to v${latestVersion}`
          : "Update to the latest version"
      }
    >
      {updateLabel}
    </Button>
  ) : null;

  if (showMainLoading) {
    return (
      <div className="app">
        <header
          className="header"
        >
          <div className="app-brand">
            <span
              className="app-brand-icon"
              role="img"
              aria-label="WakaWars logo"
            >
              <span
                className="app-brand-mark logo-mask"
                style={logoMaskStyle}
              />
            </span>
            <div className="brand-copy">
              <span className="brand-title">WakaWars</span>
              <span className="brand-sub">{headerSubtitle}</span>
            </div>
          </div>
          <div className="header-meta">{updateButton}</div>
        </header>
        <>
          {error && (
            <div
              className="error"
            >
              <span>{error}</span>
              <Button className="ghost tiny" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          )}
        </>
        <Panel>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Session</p>
              <h2>Restoring your arena</h2>
              <p className="muted">Syncing your latest battle stats.</p>
            </div>
          </div>
          <div className="loading-shimmer" aria-hidden="true" />
        </Panel>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app">
        <header
          className="header"
        >
          <div className="app-brand">
            <span
              className="app-brand-icon"
              role="img"
              aria-label="WakaWars logo"
            >
              <span
                className="app-brand-mark logo-mask"
                style={logoMaskStyle}
              />
            </span>
            <div className="brand-copy">
              <span className="brand-title">WakaWars</span>
              <span className="brand-sub">{headerSubtitle}</span>
            </div>
          </div>
          <div className="header-meta">{updateButton}</div>
        </header>
        <Panel>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Loading</p>
              <h2>Preparing WakaWars</h2>
              <p className="muted">Warming up the arena.</p>
            </div>
          </div>
          <div className="loading-shimmer" aria-hidden="true" />
        </Panel>
      </div>
    );
  }

  const showDockedAdd = Boolean(
    showDockedAddFriend &&
      isConfigured &&
      isAuthenticated &&
      !showSettings &&
      !showAchievements &&
      !showShop
  );
  const appClassName = [
    "app",
    showDockedAdd ? "has-docked-add" : "",
    appSkinsEnabled ? "skins-enabled" : "skins-disabled",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appClassName}>
      <>
        {!showWelcome && (
          <header
            className="header"
            key="main-header"
          >
            <div className="app-brand">
              <span
                className="app-brand-icon"
                role="img"
                aria-label="WakaWars logo"
              >
                <span
                  className="app-brand-mark logo-mask"
                  style={logoMaskStyle}
                />
              </span>
              <div className="brand-copy">
                <span className="brand-title">WakaWars</span>
                <span className="brand-sub">{headerSubtitle}</span>
              </div>
            </div>
            <div className="header-meta">
              {updateButton}
              {showHomeButton && (
                <Button
                  type="button"
                  className="icon-button ghost-button"
                  onClick={() => setActiveTab("league")}
                  aria-label="Back to home"
                  title="Back to home"
                >
                  <HomeHeaderIcon />
                </Button>
              )}
              {!showHomeButton && canRefresh && (
                <Button
                  type="button"
                  className="icon-button ghost-button"
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  aria-label={refreshing ? "Refreshing stats" : "Refresh stats"}
                >
                  ↻
                </Button>
              )}
              {canShowControlTabs && (
                <Button
                  type="button"
                  className={`icon-button ghost-button ${
                    activeTab === "shop" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("shop")}
                  aria-label="Shop"
                  title="Open shop"
                >
                  <ShopHeaderIcon />
                </Button>
              )}
              {canShowControlTabs && (
                <Button
                  type="button"
                  className={`icon-button ghost-button ${
                    activeTab === "achievements" ? "active" : ""
                  }`}
                  onClick={openAchievementsPage}
                  aria-label="Achievements"
                  title="Open achievements"
                >
                  <AchievementHeaderIcon />
                </Button>
              )}
              {canShowControlTabs && (
                <Button
                  type="button"
                  className={`icon-button ghost-button ${
                    activeTab === "settings" ? "active" : ""
                  }`}
                  onClick={() =>
                    setActiveTab((prev) =>
                      prev === "settings" ? "league" : "settings"
                    )
                  }
                  aria-label="Settings"
                >
                  ⚙︎
                </Button>
              )}
            </div>
          </header>
        )}
      </>

      <>
        {error && (
          <div
            className="error"
            key={`error-${error}`}
          >
            <span>{error}</span>
            <Button className="ghost tiny" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        )}
      </>

      <>
        {showWelcome ? (
          <View viewKey="welcome">
        <Panel className="hero-panel">
          <div className="hero-center">
            <div className="app-logo" aria-hidden="true">
              <span
                className="app-logo-mark logo-mask"
                style={logoMaskStyle}
                aria-hidden="true"
              />
              <div className="logo-orbit" />
            </div>
            <p className="eyebrow">WAKAWARS</p>
            <h2>Forge your focus arena</h2>
            <p className="muted">
              Battle friends, win medals, and keep your WakaTime momentum
              visible.
            </p>
          </div>
          <div className="hero-actions">
            <Button
              className="primary"
              type="button"
              onClick={() => setAuthView("signup")}
            >
              Enter arena
            </Button>
            <Button
              className="ghost"
              type="button"
              onClick={() => setAuthView("signin")}
            >
              Return
            </Button>
          </div>
          <div className="feature-grid">
            <div
              className="feature-card"
            >
              <h3>Daily skirmishes</h3>
              <p className="muted">
                See who leads today in minutes, not noise.
              </p>
            </div>
            <div
              className="feature-card"
            >
              <h3>Weekly crowns</h3>
              <p className="muted">Track the long game with weekly averages.</p>
            </div>
            <div
              className="feature-card"
            >
              <h3>Local-first</h3>
              <p className="muted">
                No logins, no cloud accounts, just your data.
              </p>
            </div>
          </div>
        </Panel>
          </View>
        ) : showSignIn ? (
          <View viewKey="signin">
        <Panel className="form-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Sign in</p>
              <h2>Rejoin the arena</h2>
              <p className="muted">Use your WakaWars username and password.</p>
            </div>
            {!showLogin && (
              <Button
                className="ghost tiny"
                type="button"
                onClick={() => setAuthView("welcome")}
              >
                Back
              </Button>
            )}
          </div>
          <form className="stack" onSubmit={handleLogin}>
            <label>
              WakaWars username
              <input
                type="text"
                value={login.username}
                onChange={(event) =>
                  setLogin((prev) => ({
                    ...prev,
                    username: event.target.value,
                  }))
                }
                placeholder="wakawars-username"
                required
                disabled={loading}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={login.password}
                onChange={(event) =>
                  setLogin((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder="password"
                disabled={loading}
              />
            </label>
            <Button className="primary" type="submit" disabled={loading}>
              Sign in
            </Button>
          </form>
          <div className="inline-action">
            <span className="muted">New here?</span>
            <Button
              className="ghost tiny"
              type="button"
              onClick={() => setAuthView("signup")}
            >
              Create account
            </Button>
          </div>
        </Panel>
          </View>
        ) : showSignUp ? (
          <View viewKey="signup">
        <Panel className="form-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Create account</p>
              <h2>Start your campaign</h2>
              <p className="muted">
                Set a WakaWars username and connect your token.
              </p>
            </div>
            <Button
              className="ghost tiny"
              type="button"
              onClick={() => setAuthView(showLogin ? "signin" : "welcome")}
            >
              Back
            </Button>
          </div>
          <form className="stack" onSubmit={handleOnboardingSubmit}>
            <label>
              WakaWars username
              <input
                type="text"
                value={onboarding.wakawarsUsername}
                onChange={(event) =>
                  setOnboarding((prev) => ({
                    ...prev,
                    wakawarsUsername: event.target.value,
                  }))
                }
                placeholder="wakawars-username"
                required
                disabled={loading}
              />
            </label>
            <label>
              WakaTime token
              <input
                type="password"
                value={onboarding.apiKey}
                onChange={(event) =>
                  setOnboarding((prev) => ({
                    ...prev,
                    apiKey: event.target.value,
                  }))
                }
                placeholder="wakatime_token"
                required
                disabled={loading}
              />
            </label>
            <Button className="primary" type="submit" disabled={loading}>
              Create account
            </Button>
          </form>
          <div className="inline-action">
            <span className="muted">Already in the league?</span>
            <Button
              className="ghost tiny"
              type="button"
              onClick={() => setAuthView("signin")}
            >
              Sign in
            </Button>
          </div>
        </Panel>
          </View>
        ) : showAchievements ? (
          <View viewKey="achievements">
        <Panel className="achievement-page">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Achievements</p>
              <h2>Complete trophy list</h2>
              <p className="muted">
                {achievementCatalog
                  ? `${achievementCatalog.unlockedCount}/${achievementCatalog.totalDefined} unlocked`
                  : "Loading your progress"}
              </p>
            </div>
            <Button
              type="button"
              className="ghost tiny"
              onClick={() => {
                void loadAchievementCatalog(true);
              }}
              disabled={achievementCatalogLoading}
            >
              Refresh
            </Button>
          </div>
          {achievementCatalogLoading && !achievementCatalog ? (
            <div className="loading-shimmer" aria-hidden="true" />
          ) : achievementCatalogError && !achievementCatalog ? (
            <div className="error">
              <span>{achievementCatalogError}</span>
              <Button
                className="ghost tiny"
                onClick={() => {
                  void loadAchievementCatalog(true);
                }}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="achievement-summary">
                {[
                  {
                    label: "User",
                    value: achievementCatalog?.username ?? "-",
                  },
                  {
                    label: "Total unlocks",
                    value: String(achievementCatalog?.totalUnlocks ?? 0),
                  },
                  {
                    label: "Badges unlocked",
                    value: `${achievementCatalog?.unlockedCount ?? 0}/${
                      achievementCatalog?.totalDefined ?? 0
                    }`,
                  },
                ].map((chip, index) => (
                  <div
                    key={chip.label}
                    className="summary-chip"
                  >
                    <span className="summary-chip-label">{chip.label}</span>
                    <span>{chip.value}</span>
                  </div>
                ))}
              </div>
              <div className="achievement-catalog-grid">
                {achievementCatalogEntries.map((achievement, index) => (
                  <AchievementCatalogCard
                    key={achievement.id}
                    achievement={achievement}
                    sequenceIndex={index}
                  />
                ))}
              </div>
            </>
          )}
        </Panel>
          </View>
        ) : showShop ? (
          <View viewKey="shop">
        <Panel className="shop-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Shop</p>
              <h2>Skin market</h2>
              <p className="muted">Buy and equip skins for leaderboard rows.</p>
            </div>
            <button
              type="button"
              className="ghost tiny"
              onClick={() => {
                void loadEconomy(false);
              }}
              disabled={shopLoading}
            >
              Refresh
            </button>
          </div>
          {shopLoading && !shopCatalog ? (
            <div className="loading-shimmer" aria-hidden="true" />
          ) : shopError && !shopCatalog ? (
            <div className="error">
              <span>{shopError}</span>
              <button
                className="ghost tiny"
                onClick={() => {
                  void loadEconomy(false);
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="shop-summary">
                <div className="summary-chip">
                  <span className="summary-chip-label">Coins</span>
                  <span className="coin-inline">
                    <CoinIcon />
                    <span>{shopCatalog?.coins ?? wallet?.coins ?? 0}</span>
                  </span>
                </div>
                <div className="summary-chip">
                  <span className="summary-chip-label">Skins owned</span>
                  <span>
                    {shopCatalog?.skins.filter((skin) => skin.owned).length ?? 0}/
                    {shopCatalog?.skins.length ?? 0}
                  </span>
                </div>
                <div className="summary-chip">
                  <span className="summary-chip-label">Equipped</span>
                  <span>{shopCatalog?.equippedSkinId ?? "classic"}</span>
                </div>
              </div>
              <div className="shop-grid">
                {shopCatalog?.skins.map((skin) => {
                  const pending = shopPendingSkinId === skin.id;
                  const canAfford =
                    (shopCatalog?.coins ?? wallet?.coins ?? 0) >= skin.priceCoins;
                  const buyDisabled = loading || pending || !canAfford;
                  const equipDisabled = loading || pending;

                  return (
                    <article
                      key={skin.id}
                      className={`shop-card ${skin.equipped ? "equipped" : ""}`}
                      data-skin={skin.id}
                    >
                      <div className="shop-card-head">
                        <strong>{skin.name}</strong>
                        <span className="coin-inline">
                          <CoinIcon />
                          <span>{skin.priceCoins}</span>
                        </span>
                      </div>
                      <p className="muted">{skin.description}</p>
                      <div className="shop-card-actions">
                        {!skin.owned ? (
                          <button
                            type="button"
                            className={canAfford ? "primary" : "ghost tiny"}
                            onClick={() => {
                              void handlePurchaseSkin(skin.id);
                            }}
                            disabled={buyDisabled}
                          >
                            {canAfford ? "Buy" : "Need coins"}
                          </button>
                        ) : skin.equipped ? (
                          <button type="button" className="ghost tiny" disabled>
                            Equipped
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="primary"
                            onClick={() => {
                              void handleEquipSkin(skin.id);
                            }}
                            disabled={equipDisabled}
                          >
                            Equip
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="shop-actions">
                <button
                  type="button"
                  className="ghost tiny"
                  onClick={() => {
                    void handleEquipSkin("classic");
                  }}
                  disabled={loading || shopPendingSkinId === "classic"}
                >
                  Equip classic
                </button>
              </div>
            </>
          )}
        </Panel>
          </View>
        ) : showSettings ? (
          <View viewKey="settings">
        <>
          <Panel className="settings-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Identity</p>
                <h2>WakaWars username</h2>
                <p className="muted">
                  This name is used for friends, squads, and leaderboards.
                </p>
              </div>
            </div>
            <form className="stack" onSubmit={handleUsernameUpdate}>
              <label>
                WakaWars username
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(event) => setUsernameInput(event.target.value)}
                  placeholder="wakawars-username"
                  required
                  disabled={loading}
                />
              </label>
              <Button
                className="primary"
                type="submit"
                disabled={loading || !canUpdateUsername}
              >
                Update username
              </Button>
            </form>
          </Panel>

          <Panel className="settings-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Shield</p>
                <h2>Device shield</h2>
                <p className="muted">Keep this Mac locked to your squad.</p>
              </div>
            </div>
            {session?.passwordSet ? (
              <div
                className="settings-row"
              >
                <span className="muted">Password</span>
                <span>Set</span>
              </div>
            ) : (
              <>
                <p className="muted">
                  Set a password to keep this Mac logged in.
                </p>
                <form className="stack" onSubmit={handleSetPassword}>
                  <label>
                    {passwordActionLabel}
                    <input
                      type="password"
                      value={passwordForm.password}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      placeholder="password"
                      required
                      disabled={loading}
                    />
                  </label>
                  <label>
                    Confirm password
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirm: event.target.value,
                        }))
                      }
                      placeholder="confirm password"
                      required
                      disabled={loading}
                    />
                  </label>
                  <Button className="primary" type="submit" disabled={loading}>
                    {passwordActionLabel}
                  </Button>
                </form>
              </>
            )}
          </Panel>

          <Panel className="settings-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Intel</p>
                <h2>Intel visibility</h2>
                <p className="muted">Choose who can see your stats.</p>
              </div>
            </div>
            <div className="visibility-grid">
              {[
                {
                  value: "everyone",
                  title: "Everyone",
                  description: "Anyone in your leagues can see your stats.",
                },
                {
                  value: "friends",
                  title: "Friends only",
                  description: "Only mutual friends or shared groups can view.",
                },
                {
                  value: "no_one",
                  title: "No one",
                  description: "Hide stats from everyone else.",
                },
              ].map((option, index) => (
                <label
                  key={option.value}
                  className={`visibility-option ${
                    config?.statsVisibility === option.value ? "active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="stats-visibility"
                    value={option.value}
                    checked={config?.statsVisibility === option.value}
                    onChange={() =>
                      handleVisibilityChange(
                        option.value as PublicConfig["statsVisibility"]
                      )
                    }
                    disabled={loading}
                  />
                  <div className="visibility-copy">
                    <span className="visibility-title">{option.title}</span>
                    <span className="muted">{option.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </Panel>

          <Panel className="settings-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Rivals</p>
                <h2>Rival roster</h2>
                <p className="muted">
                  {config?.friends.length ?? 0} rivals on deck.
                </p>
              </div>
            </div>
            {config?.friends.length ? (
              <div className="settings-list">
                {config.friends.map((friend, index) => (
                  <div
                    className="settings-row"
                    key={friend.username}
                  >
                    <span>{friend.username}</span>
                    <Button
                      className="ghost danger tiny"
                      type="button"
                      onClick={() => handleRemoveFriend(friend.username)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No rivals yet. Recruit them below.</p>
            )}
          </Panel>

          <Panel className="settings-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Squads</p>
                <h2>Squad lineup</h2>
                <p className="muted">
                  {config?.groups.length ?? 0} squads saved.
                </p>
              </div>
            </div>
            <form className="row group-create" onSubmit={handleCreateGroup}>
              <input
                type="text"
                placeholder="New group name"
                value={groupNameInput}
                onChange={(event) => setGroupNameInput(event.target.value)}
                disabled={loading}
              />
              <Button className="primary" type="submit" disabled={loading}>
                Create
              </Button>
            </form>
            {config?.groups.length ? (
              <div className="group-list">
                {config.groups.map((group, groupIndex) => (
                  <div
                    className="group-block"
                    key={group.id}
                  >
                    <div className="group-header">
                      <div className="group-title">
                        <h3>{group.name}</h3>
                        <span className="muted">
                          {group.members.length} members
                        </span>
                      </div>
                      <Button
                        className="ghost danger tiny"
                        type="button"
                        onClick={() => handleDeleteGroup(group.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                    {group.members.length ? (
                      <div className="settings-list">
                        {group.members.map((member, memberIndex) => (
                          <div
                            className="settings-row"
                            key={member.id}
                          >
                            <span>{member.username}</span>
                            <Button
                              className="ghost danger tiny"
                              type="button"
                              onClick={() =>
                                handleRemoveGroupMember(
                                  group.id,
                                  member.username
                                )
                              }
                              disabled={loading}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">No members yet.</p>
                    )}
                    <form
                      className="row group-add"
                      onSubmit={(event) =>
                        handleAddGroupMember(event, group.id)
                      }
                    >
                      <input
                        type="text"
                        placeholder="Add member by username"
                        value={groupMemberInputs[group.id] ?? ""}
                        onChange={(event) =>
                          setGroupMemberInputs((prev) => ({
                            ...prev,
                            [group.id]: event.target.value,
                          }))
                        }
                        disabled={loading}
                      />
                      <Button
                        className="ghost"
                        type="submit"
                        disabled={loading}
                      >
                        Add
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                Create squads to add multiple rivals at once.
              </p>
            )}
          </Panel>

          <Panel className="settings-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">History</p>
                <h2>Last 7 daily podiums</h2>
                <p className="muted">Yesterday to seven days ago.</p>
              </div>
            </div>
            {dailyHistory?.days?.length ? (
              <div className="history-days">
                {historyDays.map((day, dayIndex) => (
                  <div
                    className="history-day"
                    key={`${day.offsetDays}-${day.date}`}
                  >
                    <div className="history-day-head">
                      <span className="history-day-title">
                        {formatHistoryDayLabel(day.offsetDays)}
                      </span>
                      <span className="muted history-day-date">
                        {formatDateKey(day.date)}
                      </span>
                    </div>
                    {day.podium.length ? (
                      <div className="mini-list">
                        {day.podium.map((entry, podiumIndex) => (
                          <MiniRow
                            key={`history-${day.date}-${entry.username}`}
                            entry={entry}
                            isSelf={entry.username === config?.wakawarsUsername}
                            sequenceIndex={podiumIndex}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="muted">No ranked entries.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                {loading ? "Loading history..." : "No history available yet."}
              </p>
            )}
          </Panel>

          <Panel className="settings-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Systems</p>
                <h2>Launch & style</h2>
                <p className="muted">Control launch behavior and theme.</p>
              </div>
            </div>
            <div className="settings-list">
              {[
                {
                  label: "Launch at login",
                  checked: Boolean(launchAtLogin),
                  onChange: (checked: boolean) => {
                    void handleLaunchToggle(checked);
                  },
                  disabled: launchAtLogin === null,
                },
                {
                  label: "Menu bar time",
                  checked: menuBarTimeEnabled,
                  onChange: (checked: boolean) => {
                    setMenuBarTimeEnabled(checked);
                  },
                  disabled: !menuBarTimeSupported,
                },
                {
                  label: "Menu bar rank",
                  checked: menuBarRankEnabled,
                  onChange: (checked: boolean) => {
                    setMenuBarRankEnabled(checked);
                  },
                  disabled: false,
                },
                {
                  label: "App skins",
                  checked: appSkinsEnabled,
                  onChange: (checked: boolean) => {
                    setAppSkinsEnabled(checked);
                  },
                  disabled: false,
                },
                {
                  label: "Light theme",
                  checked: theme === "light",
                  onChange: (checked: boolean) => {
                    setTheme(checked ? "light" : "dark");
                  },
                  disabled: false,
                },
              ].map((item, index) => (
                <div
                  className="settings-row"
                  key={item.label}
                >
                  <span className="muted">{item.label}</span>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(event) => item.onChange(event.target.checked)}
                      disabled={item.disabled}
                    />
                    <span className="toggle-ui" />
                  </label>
                </div>
              ))}
            </div>
            {launchAtLoginStatus === "requires-approval" && (
              <p className="muted">
                macOS needs approval in System Settings &gt; General &gt; Login
                Items.
              </p>
            )}
            {launchAtLogin === null && (
              <p className="muted">
                Launch at login is available in the macOS app.
              </p>
            )}
            {!menuBarTimeSupported && (
              <p className="muted">
                Menu bar time is available in the macOS app.
              </p>
            )}
          </Panel>

          <AddFriendCard
            friendInput={friendInput}
            onFriendInputChange={(value) => {
              setFriendInput(value);
              if (addFriendError) {
                setAddFriendError(null);
              }
            }}
            onSubmit={handleAddFriend}
            loading={loading}
            errorMessage={addFriendError}
          />
        </>
          </View>
        ) : (
          <View viewKey="league">
        <>
          <Panel className="league-panel">
            <div className="league-header">
              <div className="league-title">
                <div className="league-title-row">
                  <h2>
                    <span>
                      {activeLeagueTab === "weekly"
                        ? "Weekly leaderboard"
                        : "Daily leaderboard"}
                    </span>
                  </h2>
                  <span className="meta-pill coin-pill league-coin-pill" title={`${coinBalance} coins`}>
                    <CoinIcon />
                    <span>{coinBalance}</span>
                  </span>
                </div>
              </div>
              <div className="league-actions">
                <div className="tab-group">
                  <Button
                    type="button"
                    className={`tab-button ${
                      activeLeagueTab === "today" ? "active" : ""
                    }`}
                    onClick={() => setActiveLeagueTab("today")}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    className={`tab-button ${
                      activeLeagueTab === "weekly" ? "active" : ""
                    }`}
                    onClick={() => setActiveLeagueTab("weekly")}
                  >
                    Week
                  </Button>
                </div>
                {config && (
                  <Button
                    type="button"
                    className={`ghost competition-toggle ${
                      isCompeting ? "danger" : ""
                    }`}
                    onClick={handleCompetitionToggle}
                  >
                    {competitionButtonLabel}
                  </Button>
                )}
              </div>
            </div>
            {activeStats ? (
              listEntries.length === 0 && !hasPinnedEntry ? (
                <div className="empty-state">
                  <h3>No rivals yet</h3>
                  <p className="muted">
                    Recruit rivals to start your first clash.
                  </p>
                </div>
              ) : (
                <div className="league-content">
                  <div className="list-section primary">
                    {listEntries.length === 0 && !hasPinnedEntry ? (
                      <p className="muted">No rivals yet.</p>
                    ) : (
                      <div className="list">
                        <>
                          {displayPinnedEntry &&
                            (activeLeagueTab === "weekly" ? (
                              <WeeklyLeaderboardRow
                                key={`self-${displayPinnedEntry.username}`}
                                entry={
                                  displayPinnedEntry as WeeklyLeaderboardEntry
                                }
                                isSelf
                                sequenceIndex={0}
                                onSelect={handleRowSelect}
                              />
                            ) : (
                              <LeaderboardRow
                                key={`self-${displayPinnedEntry.username}`}
                                entry={displayPinnedEntry as LeaderboardEntry}
                                isSelf
                                sequenceIndex={0}
                                onSelect={handleRowSelect}
                              />
                            ))}
                          {activeLeagueTab === "weekly"
                            ? listEntries.map((entry, index) => (
                                <WeeklyLeaderboardRow
                                  key={entry.username}
                                  entry={entry as WeeklyLeaderboardEntry}
                                  isSelf={
                                    entry.username === config?.wakawarsUsername
                                  }
                                  sequenceIndex={displayPinnedEntry ? index + 1 : index}
                                  onSelect={handleRowSelect}
                                />
                              ))
                            : listEntries.map((entry, index) => (
                                <LeaderboardRow
                                  key={entry.username}
                                  entry={entry as LeaderboardEntry}
                                  isSelf={
                                    entry.username === config?.wakawarsUsername
                                  }
                                  sequenceIndex={displayPinnedEntry ? index + 1 : index}
                                  onSelect={handleRowSelect}
                                />
                              ))}
                        </>
                      </div>
                    )}
                  </div>
                  <div className="league-grid">
                    <div className="league-side">
                      <div
                        className="subcard podium-card"
                      >
                        <div className="subcard-header">
                          <h3>Yesterday's podium</h3>
                          <span className="muted">Top 3</span>
                        </div>
                        {yesterdayPodium.length ? (
                          <div className="mini-list">
                            {yesterdayPodium.map((entry, index) => (
                              <MiniRow
                                key={`podium-${entry.username}`}
                                entry={entry}
                                isSelf={
                                  entry.username === config?.wakawarsUsername
                                }
                                sequenceIndex={index}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="muted">No ranked entries yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <p className="muted">
                {activeLeagueTab === "weekly"
                  ? "No weekly stats yet."
                  : "No stats yet."}
              </p>
            )}
          </Panel>
          <>
            {showHoverModal && (
              <div
                className="achievement-hover-backdrop"
                aria-hidden="true"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setHoveredUsername(null);
                }}
              />
            )}
            {showHoverModal && hoveredUsername && hoveredAchievementsState && (
              <UserAchievementsModal
                modalRef={achievementsModalRef}
                username={hoveredAchievementsState.data?.username ?? hoveredUsername}
                state={hoveredAchievementsState}
                onRetry={() => {
                  void fetchUserAchievements(hoveredUsername, true);
                }}
              />
            )}
          </>
          {showDockedAdd && (
            <AddFriendCard
              docked
              dismissible
              onDismiss={() => {
                setShowDockedAddFriend(false);
                localStorage.setItem("wakawarsHideDockedAdd", "true");
              }}
              friendInput={friendInput}
              onFriendInputChange={(value) => {
                setFriendInput(value);
                if (addFriendError) {
                  setAddFriendError(null);
                }
              }}
              onSubmit={handleAddFriend}
              loading={loading}
              errorMessage={addFriendError}
            />
          )}
        </>
          </View>
        )}
      </>
    </div>
  );
};

const statusLabel = (
  status: LeaderboardEntry["status"],
  totalSeconds: number
): string | null => {
  if (status === "ok") {
    return formatDuration(totalSeconds);
  }
  if (status === "private") {
    return "Private";
  }
  if (status === "not_found") {
    return "Not found";
  }
  return "Error";
};

const rankDisplay = (rank: number | null) => {
  return {
    rankLabel: rank ? `#${rank}` : "—",
    podiumClass: rank && rank <= 3 ? `podium podium-${rank}` : "",
  };
};

type RowEntry = LeaderboardEntry | WeeklyLeaderboardEntry;

const formatDateKey = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

const formatHistoryDayLabel = (offsetDays: number): string => {
  if (offsetDays <= 1) return "Yesterday";
  if (offsetDays === 2) return "2 days ago";
  return `${offsetDays} days ago`;
};

const formatAchievementDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatOptionalAchievementDate = (value: string | null): string => {
  if (!value) return "Not unlocked yet";
  return formatAchievementDate(value);
};

const AchievementCatalogCard = ({
  achievement,
  sequenceIndex = 0,
}: {
  achievement: AchievementCatalogItem;
  sequenceIndex?: number;
}) => {
  const rarity = getAchievementRarity(achievement.id);

  return (
    <div
      className={`achievement-catalog-card ${
        achievement.unlocked ? "unlocked" : "locked"
      } rarity-${rarity}`}
      data-rarity={rarity}
      aria-disabled={!achievement.unlocked}
    >
      <div className="achievement-catalog-icon">{achievement.icon}</div>
      <div className="achievement-catalog-copy">
        <div className="achievement-catalog-title-row">
          <span className="achievement-catalog-title">{achievement.title}</span>
          <span className="achievement-catalog-count">
            {achievement.count > 0 ? `${achievement.count}x` : "Locked"}
          </span>
        </div>
        <p className="achievement-catalog-desc">{achievement.description}</p>
        <span className="achievement-catalog-meta">
          Last unlock: {formatOptionalAchievementDate(achievement.lastAwardedAt)}
        </span>
      </div>
    </div>
  );
};

const UserAchievementsModal = ({
  modalRef,
  username,
  state,
  onRetry,
}: {
  modalRef: RefObject<HTMLElement>;
  username: string;
  state: { loading: boolean; data: UserAchievementsPayload | null; error: string | null };
  onRetry: () => void;
}) => {
  const achievements = state.data?.achievements ?? [];

  return (
    <aside
      ref={modalRef}
      className="achievement-hover-modal"
    >
      <div className="achievement-hover-head">
        <p className="eyebrow">Achievements</p>
        <h3>{username}</h3>
        <span className="muted">
          Total unlocks: {state.data?.totalUnlocks ?? 0}
        </span>
      </div>
      {state.loading && !state.data ? (
        <p className="muted">Loading achievements...</p>
      ) : state.error && !state.data ? (
        <div className="achievement-hover-error">
          <p className="muted">{state.error}</p>
          <Button type="button" className="ghost tiny" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : achievements.length === 0 ? (
        <p className="muted">No achievements unlocked yet.</p>
      ) : (
        <div className="achievement-hover-list">
          {achievements.map((achievement, index) => {
            const rarity = getAchievementRarity(achievement.id);

            return (
              <div
                key={achievement.id}
                className={`achievement-hover-item rarity-${rarity}`}
                data-rarity={rarity}
              >
                <div
                  className="achievement-hover-icon"
                  title={achievement.description}
                  aria-label={`${achievement.title}: ${achievement.description}`}
                >
                  {achievement.icon}
                  <span className="achievement-hover-count-badge">
                    {achievement.count}x
                  </span>
                </div>
                <div className="achievement-hover-copy">
                  <div className="achievement-hover-title-row">
                    <span className="achievement-hover-title">
                      {achievement.title}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};

const MiniRow = ({
  entry,
  isSelf,
  sequenceIndex = 0,
}: {
  entry: RowEntry;
  isSelf: boolean;
  sequenceIndex?: number;
}) => {
  const { rankLabel, podiumClass } = rankDisplay(entry.rank ?? null);
  const timeLabel = statusLabel(entry.status, entry.totalSeconds);
  const timeClass =
    entry.status === "ok" ? "mini-time" : "mini-time muted status";
  const displayName = isSelf ? `${entry.username} (you)` : entry.username;

  return (
    <div
      className={`mini-row ${podiumClass}`}
    >
      <span className="mini-rank">{rankLabel}</span>
      <span className="mini-name">{displayName}</span>
      <span className={timeClass}>{timeLabel ?? "—"}</span>
    </div>
  );
};

const BaseLeaderboardRow = ({
  entry,
  isSelf,
  secondary,
  sequenceIndex = 0,
  onSelect,
}: {
  entry: RowEntry;
  isSelf: boolean;
  secondary?: string | null;
  sequenceIndex?: number;
  onSelect?: (username: string) => void;
}) => {
  const { rankLabel, podiumClass } = rankDisplay(entry.rank ?? null);
  const timeLabel = statusLabel(entry.status, entry.totalSeconds);
  const timeClass = entry.status === "ok" ? "time" : "time muted status";
  const subtitle = [entry.honorTitle ?? null, secondary]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(" • ");
  const skinId = entry.equippedSkinId ?? "classic";
  const handleClick = () => onSelect?.(entry.username);
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(entry.username);
  };

  return (
    <div
      className={`row-item row-item-trigger ${isSelf ? "self" : ""} ${podiumClass} status-${entry.status} skin-${skinId}`}
      data-skin={skinId}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? handleClick : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="row-item-left">
        <div className="avatar">{entry.username.slice(0, 1).toUpperCase()}</div>
        <div className="row-content">
          <div className="row-title">
            <span className="username-trigger">{entry.username}</span>
            {isSelf && <span className="badge">YOU</span>}
          </div>
          {subtitle && (
            <div className="row-sub">
              <span>{subtitle}</span>
            </div>
          )}
        </div>
      </div>
      <div className="row-meta">
        <div className="row-meta-top">
          {timeLabel && <span className={timeClass}>{timeLabel}</span>}
          <span className="rank-display">{rankLabel}</span>
        </div>
      </div>
    </div>
  );
};

const LeaderboardRow = ({
  entry,
  isSelf,
  sequenceIndex,
  onSelect,
}: {
  entry: LeaderboardEntry;
  isSelf: boolean;
  sequenceIndex?: number;
  onSelect?: (username: string) => void;
}) => {
  return (
    <BaseLeaderboardRow
      entry={entry}
      isSelf={isSelf}
      sequenceIndex={sequenceIndex}
      onSelect={onSelect}
    />
  );
};

const WeeklyLeaderboardRow = ({
  entry,
  isSelf,
  sequenceIndex,
  onSelect,
}: {
  entry: WeeklyLeaderboardEntry;
  isSelf: boolean;
  sequenceIndex?: number;
  onSelect?: (username: string) => void;
}) => {
  const averageLabel =
    entry.status === "ok" ? formatDuration(entry.dailyAverageSeconds) : null;

  return (
    <BaseLeaderboardRow
      entry={entry}
      isSelf={isSelf}
      secondary={averageLabel ? `Avg ${averageLabel}/day` : null}
      sequenceIndex={sequenceIndex}
      onSelect={onSelect}
    />
  );
};

export default App;
