import type { Allowlist } from "./allowlist";
import type { CommunityCache } from "./community-cache";
import type { GuildDirectory, InstallationService } from "./installation";
import { describeError, type Logger } from "./logger";
import type { BotRepository } from "./repository";

export interface Heartbeat {
  start(): void;
  stop(): void;
  /** One beat; exposed for tests. Never throws. */
  tick(): Promise<void>;
}

/**
 * Periodic liveness signal. Each beat refreshes the community cache, connects
 * communities that appeared in NEXUS after startup, and sets `botLastSeenAt`
 * for the allowlisted communities whose guild the bot is present in with ONE
 * `updateMany`. A failing beat only logs: it never marks anything offline (the
 * web derives "offline" from a stale `botLastSeenAt`, see src/lib/bot-status).
 */
export function createHeartbeat(deps: {
  repository: BotRepository;
  cache: CommunityCache;
  allowlist: Allowlist;
  directory: GuildDirectory;
  installation: InstallationService;
  logger: Logger;
  intervalMs: number;
  now?: () => Date;
  /** Runs after every beat (used to report aggregated rejection counters). */
  onTick?: () => void;
}): Heartbeat {
  const { repository, cache, allowlist, directory, installation, logger } =
    deps;
  const now = deps.now ?? (() => new Date());
  let timer: ReturnType<typeof setInterval> | undefined;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      if (!allowlist.enabled) return;
      if (!directory.isGatewayReady()) {
        logger.warn("heartbeat_skipped", { reason: "gateway_not_ready" });
        return;
      }
      // The ready-time reconcile may have failed (database down at startup).
      if (!installation.reconciled) {
        await installation.reconcile();
        return;
      }
      await cache.refresh();
      await installation.connectNewlyPresent();
      const present = cache
        .entries()
        .filter(([guildId]) => directory.presence(guildId) === "present")
        .map(([, community]) => community.communityId);
      const updated = await repository.touch(present, now());
      logger.debug("heartbeat", { communities: present.length, updated });
    } catch (error) {
      logger.warn("heartbeat_failed", describeError(error));
    } finally {
      running = false;
      try {
        deps.onTick?.();
      } catch {
        // Reporting must never break the beat.
      }
    }
  };

  return {
    tick,
    start() {
      if (timer) return;
      timer = setInterval(() => void tick(), deps.intervalMs);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
  };
}
