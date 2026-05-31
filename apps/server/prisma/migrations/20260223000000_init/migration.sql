-- CreateEnum
CREATE TYPE "ww_stats_visibility" AS ENUM ('everyone', 'friends', 'no_one');

-- CreateEnum
CREATE TYPE "ww_coin_transaction_reason" AS ENUM ('daily_rank_reward', 'skin_purchase');

-- CreateEnum
CREATE TYPE "ww_achievement_context_kind" AS ENUM ('daily', 'weekly');

-- CreateTable
CREATE TABLE "ww_user" (
    "id" SERIAL NOT NULL,
    "wakawars_username" TEXT NOT NULL,
    "api_key" TEXT NOT NULL DEFAULT '',
    "wakatime_timezone" TEXT,
    "password_hash" TEXT,
    "stats_visibility" "ww_stats_visibility" NOT NULL DEFAULT 'everyone',
    "is_competing" BOOLEAN NOT NULL DEFAULT true,
    "coin_balance" INTEGER NOT NULL DEFAULT 0,
    "equipped_skin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_group" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_group_member" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_group_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_friendship" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "friend_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_session" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ww_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_daily_stat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date_key" TEXT NOT NULL,
    "total_seconds" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_daily_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_weekly_stat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "range_key" TEXT NOT NULL,
    "total_seconds" INTEGER NOT NULL DEFAULT 0,
    "daily_average_seconds" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_weekly_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_user_skin" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "skin_id" TEXT NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_user_skin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_coin_ledger" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "ww_coin_transaction_reason" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_coin_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_daily_reward_settlement" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date_key" TEXT NOT NULL,
    "rank" INTEGER,
    "coins_awarded" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_daily_reward_settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_user_achievement" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "achievement_key" TEXT NOT NULL,
    "context_kind" "ww_achievement_context_kind" NOT NULL,
    "context_key" TEXT NOT NULL,
    "metadata" JSONB,
    "awarded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_user_achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ww_provider_log" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "user_id" INTEGER,
    "endpoint" TEXT NOT NULL,
    "range_key" TEXT,
    "status_code" INTEGER,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "error" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ww_provider_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ww_user_wakawars_username_key" ON "ww_user"("wakawars_username");

-- CreateIndex
CREATE INDEX "ww_group_owner_id_idx" ON "ww_group"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "ww_group_owner_id_name_key" ON "ww_group"("owner_id", "name");

-- CreateIndex
CREATE INDEX "ww_group_member_user_id_idx" ON "ww_group_member"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ww_group_member_group_id_user_id_key" ON "ww_group_member"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "ww_friendship_friend_id_idx" ON "ww_friendship"("friend_id");

-- CreateIndex
CREATE UNIQUE INDEX "ww_friendship_user_id_friend_id_key" ON "ww_friendship"("user_id", "friend_id");

-- CreateIndex
CREATE UNIQUE INDEX "ww_session_token_key" ON "ww_session"("token");

-- CreateIndex
CREATE INDEX "ww_daily_stat_date_key_idx" ON "ww_daily_stat"("date_key");

-- CreateIndex
CREATE UNIQUE INDEX "ww_daily_stat_user_id_date_key_key" ON "ww_daily_stat"("user_id", "date_key");

-- CreateIndex
CREATE INDEX "ww_weekly_stat_range_key_idx" ON "ww_weekly_stat"("range_key");

-- CreateIndex
CREATE UNIQUE INDEX "ww_weekly_stat_user_id_range_key_key" ON "ww_weekly_stat"("user_id", "range_key");

-- CreateIndex
CREATE INDEX "ww_user_skin_skin_id_idx" ON "ww_user_skin"("skin_id");

-- CreateIndex
CREATE UNIQUE INDEX "ww_user_skin_user_id_skin_id_key" ON "ww_user_skin"("user_id", "skin_id");

-- CreateIndex
CREATE INDEX "ww_coin_ledger_user_id_created_at_idx" ON "ww_coin_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ww_daily_reward_settlement_date_key_idx" ON "ww_daily_reward_settlement"("date_key");

-- CreateIndex
CREATE UNIQUE INDEX "ww_daily_reward_settlement_user_id_date_key_key" ON "ww_daily_reward_settlement"("user_id", "date_key");

-- CreateIndex
CREATE INDEX "ww_user_achievement_user_id_awarded_at_idx" ON "ww_user_achievement"("user_id", "awarded_at");

-- CreateIndex
CREATE INDEX "ww_user_achievement_achievement_key_idx" ON "ww_user_achievement"("achievement_key");

-- CreateIndex
CREATE UNIQUE INDEX "ww_user_achievement_user_id_achievement_key_context_kind_co_key" ON "ww_user_achievement"("user_id", "achievement_key", "context_kind", "context_key");

-- CreateIndex
CREATE INDEX "ww_provider_log_provider_idx" ON "ww_provider_log"("provider");

-- CreateIndex
CREATE INDEX "ww_provider_log_user_id_idx" ON "ww_provider_log"("user_id");

-- CreateIndex
CREATE INDEX "ww_provider_log_endpoint_idx" ON "ww_provider_log"("endpoint");

-- AddForeignKey
ALTER TABLE "ww_group" ADD CONSTRAINT "ww_group_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_group_member" ADD CONSTRAINT "ww_group_member_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ww_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_group_member" ADD CONSTRAINT "ww_group_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_friendship" ADD CONSTRAINT "ww_friendship_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_friendship" ADD CONSTRAINT "ww_friendship_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_session" ADD CONSTRAINT "ww_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_daily_stat" ADD CONSTRAINT "ww_daily_stat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_weekly_stat" ADD CONSTRAINT "ww_weekly_stat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_user_skin" ADD CONSTRAINT "ww_user_skin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_coin_ledger" ADD CONSTRAINT "ww_coin_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_daily_reward_settlement" ADD CONSTRAINT "ww_daily_reward_settlement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_user_achievement" ADD CONSTRAINT "ww_user_achievement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ww_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ww_provider_log" ADD CONSTRAINT "ww_provider_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ww_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
