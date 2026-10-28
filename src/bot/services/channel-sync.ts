import type { PrismaClient } from "@/generated/prisma/client";
import type { Allowlist } from "./allowlist";
import type { CommunityCache } from "./community-cache";
import { describeError, type Logger } from "./logger";

/**
 * Channel metadata (Phase 4): a display label per channel or thread, so the
 * analytics can show names instead of ids. Labels only: id, name, type. No
 * permissions, topics or messages. Sourced from the Gateway guild cache; there
 * are no REST calls, and a failure only logs.
 */
export interface ChannelInfo {
  id: string;
  guildId: string;
  name: string;
  /** discord.js `ChannelType` numeric value. */
  type: number;
}

export interface ChannelRepository {
  /** Insert or refresh channels of one community (also clears `deletedAt`). */
  upsertChannels(
    communityId: string,
    guildId: string,
    channels: readonly ChannelInfo[],
    at: Date,
  ): Promise<void>;
  /** Mark a channel deleted (the label is kept). */
  markChannelDeleted(channelId: string, at: Date): Promise<void>;
}

/** Read-only view of the Gateway guild cache (adapter in handlers/channels). */
export interface ChannelDirectory {
  /** Text-capable channels and active threads the client knows for a guild. */
  channels(guildId: string): ChannelInfo[];
}

export interface ChannelSync {
  /** Sync the whole cached channel list of one guild (ready, guildCreate). */
  syncGuild(guildId: string): Promise<void>;
  /** Sync every known community's guild (also heals missed events). */
  syncAll(): Promise<void>;
  /** channelCreate / channelUpdate / threadCreate / threadUpdate. */
  upsert(channel: ChannelInfo): Promise<void>;
  /** channelDelete / threadDelete. */
  remove(channel: { id: string; guildId: string }): Promise<void>;
}

export function createPrismaChannelRepository(
  db: Pick<PrismaClient, "$executeRaw" | "discordChannel">,
): ChannelRepository {
  return {
    async upsertChannels(communityId, guildId, channels, at) {
      if (channels.length === 0) return;
      const json = JSON.stringify(
        channels.map(({ id, name, type }) => ({ id, name, type })),
      );
      const atIso = at.toISOString();
      // One statement for the whole guild (can be hundreds of channels).
      await db.$executeRaw`
        INSERT INTO discord_channels
          (discord_channel_id, community_id, discord_guild_id, name, type, deleted_at, updated_at)
        SELECT x.id, ${communityId}, ${guildId}, x.name, x.type, NULL, ${atIso}::timestamp
        FROM jsonb_to_recordset(${json}::jsonb) AS x(id text, name text, type int)
        ON CONFLICT (discord_channel_id) DO UPDATE
          SET name = EXCLUDED.name, type = EXCLUDED.type,
              deleted_at = NULL, updated_at = EXCLUDED.updated_at`;
    },

    async markChannelDeleted(channelId, at) {
      await db.discordChannel.updateMany({
        where: { discordChannelId: channelId, deletedAt: null },
        data: { deletedAt: at },
      });
    },
  };
}

export function createChannelSync(deps: {
  repository: ChannelRepository;
  cache: CommunityCache;
  allowlist: Allowlist;
  directory: ChannelDirectory;
  logger: Logger;
  now?: () => Date;
}): ChannelSync {
  const { repository, cache, allowlist, directory, logger } = deps;
  const now = deps.now ?? (() => new Date());

  /** Allowlisted guild that maps to a NEXUS community, else undefined. */
  const communityOf = async (guildId: string) => {
    if (!allowlist.has(guildId)) return undefined;
    return cache.get(guildId) ?? (await cache.refreshGuild(guildId));
  };

  const guarded = async (
    event: string,
    guildId: string,
    job: () => Promise<void>,
  ) => {
    try {
      await job();
    } catch (error) {
      logger.warn(event, { guildId, ...describeError(error) });
    }
  };

  const syncGuild = (guildId: string) =>
    guarded("channel_sync_failed", guildId, async () => {
      const community = await communityOf(guildId);
      if (!community) return;
      const channels = directory.channels(guildId);
      await repository.upsertChannels(
        community.communityId,
        guildId,
        channels,
        now(),
      );
      logger.info("channels_synced", { guildId, channels: channels.length });
    });

  return {
    syncGuild,

    async syncAll() {
      for (const [guildId] of cache.entries()) await syncGuild(guildId);
    },

    upsert: (channel) =>
      guarded("channel_upsert_failed", channel.guildId, async () => {
        const community = await communityOf(channel.guildId);
        if (!community) return;
        await repository.upsertChannels(
          community.communityId,
          channel.guildId,
          [channel],
          now(),
        );
      }),

    remove: ({ id, guildId }) =>
      guarded("channel_delete_failed", guildId, async () => {
        if (!(await communityOf(guildId))) return;
        await repository.markChannelDeleted(id, now());
      }),
  };
}
