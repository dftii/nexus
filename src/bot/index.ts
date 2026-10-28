/**
 * NEXUS Discord bot: a standalone, long-running Node process (NOT part of the
 * Next.js app). Run with `npm run bot:dev` / `npm run bot:start`.
 *
 * Boundaries: this file and everything under `src/bot` may import `src/lib`,
 * `src/generated` and the framework-agnostic `@/server/db/prisma` core. They
 * must never import `@/server/db` (index), `@/server/auth` or `next/*`: those
 * pull in `server-only`, which throws in plain Node (enforced by ESLint).
 *
 * Exit codes: 0 clean shutdown, 1 runtime failure (login failed, unhandled
 * error), 2 invalid configuration.
 */
import { DiscordjsErrorCodes } from "discord.js";
import { getPrismaClient } from "@/server/db/prisma";
import { createBotClient } from "./client";
import { BotConfigError, parseBotConfig } from "./config";
import { createGuildDirectory, registerGuildHandlers } from "./handlers/guilds";
import { registerLifecycleHandlers } from "./handlers/lifecycle";
import { registerMessageHandler } from "./handlers/messages";
import { createAllowlist } from "./services/allowlist";
import { createCommunityCache } from "./services/community-cache";
import { createHeartbeat } from "./services/heartbeat";
import { createIngestion } from "./services/ingestion";
import { createInstallationService } from "./services/installation";
import { createLogger, describeError } from "./services/logger";
import { createPrismaBotRepository } from "./services/repository";

const SHUTDOWN_FLUSH_TIMEOUT_MS = 5_000;

async function main(): Promise<number> {
  const logger = createLogger();

  let config;
  try {
    config = parseBotConfig(process.env);
  } catch (error) {
    logger.error("config_invalid", {
      problems:
        error instanceof BotConfigError
          ? error.problems
          : [describeError(error).message],
    });
    return 2;
  }

  const allowlist = createAllowlist(config.allowlist);
  if (allowlist.enabled) {
    logger.info("bot_starting", { allowedGuilds: allowlist.ids });
  } else {
    logger.warn("processing_disabled", {
      reason: "DISCORD_GUILD_ALLOWLIST is missing or empty",
      hint: "Set DISCORD_GUILD_ALLOWLIST to a comma-separated list of server IDs (Discord Developer Mode, right-click the server, Copy Server ID). Until then the bot only logs in; it stores nothing and writes nothing.",
    });
  }

  const prisma = getPrismaClient();
  const repository = createPrismaBotRepository(prisma);
  const client = createBotClient();
  const directory = createGuildDirectory(client);
  const cache = createCommunityCache({ repository, allowlist, logger });
  const installation = createInstallationService({
    repository,
    cache,
    allowlist,
    directory,
    logger,
  });
  const ingestion = createIngestion({ repository, allowlist, cache, logger });
  const heartbeat = createHeartbeat({
    repository,
    cache,
    allowlist,
    directory,
    installation,
    logger,
    intervalMs: config.heartbeatIntervalMs,
    onTick: () => ingestion.reportRejections(),
  });

  registerLifecycleHandlers(client, {
    logger,
    onReady: async () => {
      await installation.reconcile();
      heartbeat.start();
    },
  });
  registerGuildHandlers(client, installation);
  registerMessageHandler(client, ingestion);

  let shuttingDown = false;
  let finish: (code: number) => void = () => undefined;
  const finished = new Promise<number>((resolve) => {
    finish = resolve;
  });

  const shutdown = async (reason: string, code: number) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("shutdown_started", { reason });
    heartbeat.stop();
    try {
      const { remaining } = await ingestion.stop(SHUTDOWN_FLUSH_TIMEOUT_MS);
      if (remaining > 0) logger.warn("shutdown_unflushed", { remaining });
    } catch (error) {
      logger.warn("shutdown_flush_failed", describeError(error));
    }
    try {
      await client.destroy();
    } catch (error) {
      logger.warn("shutdown_client_destroy_failed", describeError(error));
    }
    try {
      await prisma.$disconnect();
    } catch (error) {
      logger.warn("shutdown_db_disconnect_failed", describeError(error));
    }
    logger.info("shutdown_complete", { exitCode: code });
    finish(code);
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      if (shuttingDown) {
        // Second signal while shutting down: stop waiting.
        process.exit(1);
      }
      void shutdown(signal, 0);
    });
  }
  process.on("unhandledRejection", (reason) => {
    logger.error("unhandled_rejection", describeError(reason));
    void shutdown("unhandled_rejection", 1);
  });
  process.on("uncaughtException", (error) => {
    logger.error("uncaught_exception", describeError(error));
    void shutdown("uncaught_exception", 1);
  });

  // Best effort: have the community cache warm before the first messages. A
  // database outage here is not fatal; the heartbeat retries.
  await cache.refresh();
  ingestion.start();

  try {
    await client.login(config.token);
  } catch (error) {
    const info = describeError(error);
    logger.error("login_failed", {
      reason:
        info.code === DiscordjsErrorCodes.TokenInvalid
          ? "token_invalid"
          : "login_error",
      ...info,
    });
    await shutdown("login_failed", 1);
    return finished;
  }

  return finished;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    createLogger().error("fatal", describeError(error));
    process.exit(1);
  },
);
