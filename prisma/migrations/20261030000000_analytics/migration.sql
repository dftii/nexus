-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "analytics_aggregated_at" TIMESTAMP(3),
ADD COLUMN     "analytics_finalized_through" DATE;

-- CreateTable
CREATE TABLE "community_daily_activity" (
    "community_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "message_count" INTEGER NOT NULL,
    "author_count" INTEGER NOT NULL,
    "aggregated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_daily_activity_pkey" PRIMARY KEY ("community_id","day")
);

-- CreateTable
CREATE TABLE "channel_daily_activity" (
    "community_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "discord_channel_id" TEXT NOT NULL,
    "message_count" INTEGER NOT NULL,
    "author_count" INTEGER NOT NULL,
    "aggregated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_daily_activity_pkey" PRIMARY KEY ("community_id","day","discord_channel_id")
);

-- CreateTable
CREATE TABLE "discord_channels" (
    "discord_channel_id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "discord_guild_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discord_channels_pkey" PRIMARY KEY ("discord_channel_id")
);

-- CreateIndex
CREATE INDEX "discord_channels_community_id_idx" ON "discord_channels"("community_id");

-- AddForeignKey
ALTER TABLE "community_daily_activity" ADD CONSTRAINT "community_daily_activity_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_daily_activity" ADD CONSTRAINT "channel_daily_activity_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discord_channels" ADD CONSTRAINT "discord_channels_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Counts can never be negative, and a day cannot have more distinct authors
-- than messages (hand-written: Prisma has no CHECK syntax).
ALTER TABLE "community_daily_activity" ADD CONSTRAINT "community_daily_activity_counts_check" CHECK ("message_count" >= 0 AND "author_count" >= 0 AND "author_count" <= "message_count");
ALTER TABLE "channel_daily_activity" ADD CONSTRAINT "channel_daily_activity_counts_check" CHECK ("message_count" >= 0 AND "author_count" >= 0 AND "author_count" <= "message_count");
