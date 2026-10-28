-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "bot_last_seen_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "message_events" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "discord_message_id" TEXT NOT NULL,
    "discord_guild_id" TEXT NOT NULL,
    "discord_channel_id" TEXT NOT NULL,
    "author_discord_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_events_discord_message_id_key" ON "message_events"("discord_message_id");

-- CreateIndex
CREATE INDEX "message_events_community_id_occurred_at_idx" ON "message_events"("community_id", "occurred_at");

-- CreateIndex
CREATE INDEX "message_events_community_id_discord_channel_id_occurred_at_idx" ON "message_events"("community_id", "discord_channel_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

