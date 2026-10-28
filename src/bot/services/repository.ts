import type { PrismaClient } from "@/generated/prisma/client";

/** A NEXUS community as the bot sees it. */
export interface CommunityRef {
  id: string;
  discordGuildId: string;
  botConnectedAt: Date | null;
}

/**
 * What is persisted for one message. Exactly these fields: no content, no
 * embeds, no attachments, no mentions (data minimization).
 */
export interface MessageEventRecord {
  communityId: string;
  discordMessageId: string;
  discordGuildId: string;
  discordChannelId: string;
  authorDiscordId: string;
  occurredAt: Date;
}

/** The narrow persistence interface the bot services depend on. */
export interface BotRepository {
  /** Communities that exist in NEXUS for these guild IDs (never creates). */
  findCommunitiesByGuildIds(
    guildIds: readonly string[],
  ): Promise<CommunityRef[]>;
  /** Idempotent insert; resolves to the number of rows actually stored. */
  insertMessageEvents(records: readonly MessageEventRecord[]): Promise<number>;
  /** Set `botConnectedAt = at` only where it is still null. */
  markConnected(communityIds: readonly string[], at: Date): Promise<number>;
  /** Clear `botConnectedAt` (bot removed). `botLastSeenAt` is left alone. */
  markDisconnected(communityIds: readonly string[]): Promise<number>;
  /** Set `botLastSeenAt = at`. */
  touch(communityIds: readonly string[], at: Date): Promise<number>;
}

type Db = Pick<PrismaClient, "community" | "messageEvent">;

export function createPrismaBotRepository(db: Db): BotRepository {
  return {
    async findCommunitiesByGuildIds(guildIds) {
      if (guildIds.length === 0) return [];
      return db.community.findMany({
        where: { discordGuildId: { in: [...guildIds] } },
        select: { id: true, discordGuildId: true, botConnectedAt: true },
      });
    },

    async insertMessageEvents(records) {
      if (records.length === 0) return 0;
      const result = await db.messageEvent.createMany({
        data: records.map((r) => ({
          communityId: r.communityId,
          discordMessageId: r.discordMessageId,
          discordGuildId: r.discordGuildId,
          discordChannelId: r.discordChannelId,
          authorDiscordId: r.authorDiscordId,
          occurredAt: r.occurredAt,
        })),
        skipDuplicates: true,
      });
      return result.count;
    },

    async markConnected(communityIds, at) {
      if (communityIds.length === 0) return 0;
      const result = await db.community.updateMany({
        where: { id: { in: [...communityIds] }, botConnectedAt: null },
        data: { botConnectedAt: at },
      });
      return result.count;
    },

    async markDisconnected(communityIds) {
      if (communityIds.length === 0) return 0;
      const result = await db.community.updateMany({
        where: { id: { in: [...communityIds] }, botConnectedAt: { not: null } },
        data: { botConnectedAt: null },
      });
      return result.count;
    },

    async touch(communityIds, at) {
      if (communityIds.length === 0) return 0;
      const result = await db.community.updateMany({
        where: { id: { in: [...communityIds] } },
        data: { botLastSeenAt: at },
      });
      return result.count;
    },
  };
}
