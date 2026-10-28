import type { Allowlist } from "./allowlist";
import type { CommunityCache } from "./community-cache";
import { describeError, type Logger } from "./logger";
import type { BotRepository } from "./repository";

/**
 * What the Gateway client knows about a guild:
 * - `present`: the bot is in it and it is available.
 * - `unavailable`: Discord reports an outage for it; neither connect nor clear.
 * - `absent`: the bot is not in it.
 */
export type GuildPresence = "present" | "unavailable" | "absent";

/** Read-only view of the Gateway client's guild cache (adapter in handlers). */
export interface GuildDirectory {
  presence(guildId: string): GuildPresence;
  /** Every guild ID the client currently knows. */
  guildIds(): string[];
  /** True while the Gateway session is connected and ready. */
  isGatewayReady(): boolean;
}

export interface InstallationService {
  /** True once a full reconcile succeeded. */
  readonly reconciled: boolean;
  /** `ready`: align NEXUS with the guilds the bot is actually in. */
  reconcile(): Promise<boolean>;
  /** `guildCreate` (also fires when a guild comes back from an outage). */
  onGuildAvailable(guildId: string): Promise<void>;
  /**
   * `guildDelete`. `unavailable` = Discord outage, NOT a removal: nothing is
   * cleared. A real removal clears `botConnectedAt` (events are kept).
   */
  onGuildRemoved(guildId: string, unavailable: boolean): Promise<void>;
  /** Connect allowlisted communities that appeared in NEXUS after startup. */
  connectNewlyPresent(): Promise<number>;
}

export function createInstallationService(deps: {
  repository: BotRepository;
  cache: CommunityCache;
  allowlist: Allowlist;
  directory: GuildDirectory;
  logger: Logger;
  now?: () => Date;
}): InstallationService {
  const { repository, cache, allowlist, directory, logger } = deps;
  const now = deps.now ?? (() => new Date());
  let reconciled = false;

  return {
    get reconciled() {
      return reconciled;
    },

    async reconcile() {
      if (!allowlist.enabled) return true;
      const at = now();
      try {
        const ignoredGuilds = directory
          .guildIds()
          .filter((id) => !allowlist.has(id)).length;

        if (!(await cache.refresh())) return false;

        const connect: string[] = [];
        const disconnect: string[] = [];
        const guildOf = new Map<string, string>();
        for (const [guildId, community] of cache.entries()) {
          guildOf.set(community.communityId, guildId);
          const presence = directory.presence(guildId);
          if (presence === "present") connect.push(community.communityId);
          else if (presence === "absent")
            disconnect.push(community.communityId);
        }

        const newlyConnected = await repository.markConnected(connect, at);
        await repository.touch(connect, at);
        const cleared = await repository.markDisconnected(disconnect);

        for (const id of connect) {
          const guildId = guildOf.get(id);
          if (guildId && cache.get(guildId)?.botConnectedAt == null) {
            cache.setConnected(guildId, at);
          }
        }
        for (const id of disconnect) {
          const guildId = guildOf.get(id);
          if (guildId) cache.setConnected(guildId, null);
        }

        reconciled = true;
        logger.info("reconcile_done", {
          allowlisted: allowlist.ids.length,
          withCommunity: guildOf.size,
          present: connect.length,
          newlyConnected,
          absent: disconnect.length,
          cleared,
          ignoredGuilds,
        });
        return true;
      } catch (error) {
        logger.warn("reconcile_failed", describeError(error));
        return false;
      }
    },

    async onGuildAvailable(guildId) {
      if (!allowlist.has(guildId)) {
        logger.info("guild_not_allowlisted", { event: "guildCreate" });
        return;
      }
      try {
        const community = await cache.refreshGuild(guildId);
        if (!community) {
          logger.info("guild_without_community", { guildId });
          return;
        }
        const at = now();
        const first =
          (await repository.markConnected([community.communityId], at)) > 0;
        await repository.touch([community.communityId], at);
        cache.setConnected(guildId, community.botConnectedAt ?? at);
        logger.info("bot_connected", { guildId, firstConnection: first });
      } catch (error) {
        logger.warn("guild_connect_failed", {
          guildId,
          ...describeError(error),
        });
      }
    },

    async onGuildRemoved(guildId, unavailable) {
      if (!allowlist.has(guildId)) return;
      if (unavailable) {
        logger.warn("guild_unavailable", { guildId });
        return;
      }
      try {
        const community =
          cache.get(guildId) ?? (await cache.refreshGuild(guildId));
        if (!community) return;
        const cleared = await repository.markDisconnected([
          community.communityId,
        ]);
        cache.setConnected(guildId, null);
        logger.info("bot_disconnected", { guildId, cleared: cleared > 0 });
      } catch (error) {
        logger.warn("guild_disconnect_failed", {
          guildId,
          ...describeError(error),
        });
      }
    },

    async connectNewlyPresent() {
      const pending = cache
        .entries()
        .filter(
          ([guildId, c]) =>
            c.botConnectedAt === null &&
            directory.presence(guildId) === "present",
        );
      if (pending.length === 0) return 0;
      const at = now();
      const count = await repository.markConnected(
        pending.map(([, c]) => c.communityId),
        at,
      );
      for (const [guildId] of pending) cache.setConnected(guildId, at);
      logger.info("bot_connected_late", { communities: pending.length });
      return count;
    },
  };
}
