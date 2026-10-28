import type { Allowlist } from "./allowlist";
import { describeError, type Logger } from "./logger";
import type { BotRepository } from "./repository";

export interface CachedCommunity {
  communityId: string;
  /** `botConnectedAt` as of the last refresh or local update. */
  botConnectedAt: Date | null;
}

/**
 * guildId -> community, for allowlisted guilds that exist in NEXUS. Guilds
 * without a community are simply absent (the bot never creates communities).
 */
export interface CommunityCache {
  get(guildId: string): CachedCommunity | undefined;
  entries(): Array<[guildId: string, community: CachedCommunity]>;
  /** Look up a single guild (used on guildCreate). */
  refreshGuild(guildId: string): Promise<CachedCommunity | undefined>;
  /** Reload every allowlisted guild. A failure keeps the previous cache. */
  refresh(): Promise<boolean>;
  /** Reflect a local change without a round trip. */
  setConnected(guildId: string, at: Date | null): void;
}

export function createCommunityCache(deps: {
  repository: BotRepository;
  allowlist: Allowlist;
  logger: Logger;
}): CommunityCache {
  const { repository, allowlist, logger } = deps;
  let map = new Map<string, CachedCommunity>();

  return {
    get: (guildId) => map.get(guildId),
    entries: () => [...map.entries()],

    async refresh() {
      if (!allowlist.enabled) return true;
      try {
        const rows = await repository.findCommunitiesByGuildIds(allowlist.ids);
        map = new Map(
          rows
            .filter((row) => allowlist.has(row.discordGuildId))
            .map((row) => [
              row.discordGuildId,
              { communityId: row.id, botConnectedAt: row.botConnectedAt },
            ]),
        );
        return true;
      } catch (error) {
        logger.warn("community_cache_refresh_failed", describeError(error));
        return false;
      }
    },

    async refreshGuild(guildId) {
      if (!allowlist.has(guildId)) return undefined;
      try {
        const [row] = await repository.findCommunitiesByGuildIds([guildId]);
        if (!row) {
          map.delete(guildId);
          return undefined;
        }
        const entry = {
          communityId: row.id,
          botConnectedAt: row.botConnectedAt,
        };
        map.set(guildId, entry);
        return entry;
      } catch (error) {
        logger.warn("community_cache_refresh_failed", describeError(error));
        return map.get(guildId);
      }
    },

    setConnected(guildId, at) {
      const entry = map.get(guildId);
      if (entry) map.set(guildId, { ...entry, botConnectedAt: at });
    },
  };
}
