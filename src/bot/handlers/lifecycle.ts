import { Events, type Client } from "discord.js";
import { describeError, type Logger } from "../services/logger";

/**
 * `ready` and connection lifecycle logging. Reconnection itself is left to
 * discord.js (no custom loops); we only report what it does.
 */
export function registerLifecycleHandlers(
  client: Client,
  options: { logger: Logger; onReady: () => Promise<void> | void },
): void {
  const { logger } = options;

  client.once(Events.ClientReady, (ready) => {
    logger.info("gateway_ready", { guilds: ready.guilds.cache.size });
    void Promise.resolve(options.onReady()).catch((error: unknown) => {
      logger.error("ready_handler_failed", describeError(error));
    });
  });

  client.on(Events.ShardDisconnect, (event, shardId) => {
    logger.warn("shard_disconnect", { shardId, code: event.code });
  });
  client.on(Events.ShardReconnecting, (shardId) => {
    logger.info("shard_reconnecting", { shardId });
  });
  client.on(Events.ShardResume, (shardId, replayedEvents) => {
    logger.info("shard_resume", { shardId, replayedEvents });
  });
  client.on(Events.ShardError, (error, shardId) => {
    logger.warn("shard_error", { shardId, ...describeError(error) });
  });
  client.on(Events.Error, (error) => {
    logger.error("client_error", describeError(error));
  });
  client.on(Events.Warn, (message) => {
    logger.warn("client_warning", { message });
  });
}
