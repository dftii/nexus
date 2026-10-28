import { z } from "zod";
import { BOT_HEARTBEAT_DEFAULT_INTERVAL_MS } from "@/lib/bot-status";
import { parseAllowlist } from "./services/allowlist";

/** Heartbeat bounds: below 5s is wasteful; above 2 min a single miss reads as stale. */
export const MIN_HEARTBEAT_INTERVAL_MS = 5_000;
export const MAX_HEARTBEAT_INTERVAL_MS = 120_000;

/** Raw message events are kept at least 30 days (analytics windows rely on it). */
export const MIN_RETENTION_DAYS = 30;
export const MAX_RETENTION_DAYS = 365;
export const DEFAULT_RETENTION_DAYS = 30;

export interface BotConfig {
  token: string;
  databaseUrl: string;
  /** Valid, trimmed, deduplicated server IDs. Empty = processing disabled. */
  allowlist: string[];
  heartbeatIntervalMs: number;
  /** Days of raw `message_events` kept; older days live only as aggregates. */
  retentionDays: number;
}

export class BotConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid bot configuration - ${problems.join("; ")}`);
    this.name = "BotConfigError";
  }
}

const nonEmpty = (value: string | undefined) =>
  value !== undefined && value.trim() !== "" ? value.trim() : undefined;

const schema = z.object({
  DISCORD_BOT_TOKEN: z
    .string({ error: "DISCORD_BOT_TOKEN is required" })
    .min(1, { error: "DISCORD_BOT_TOKEN is required" }),
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      error: "DATABASE_URL must be a postgresql:// connection string",
    }),
});

/**
 * Validate the bot's environment. Error messages name variables and list
 * positions only; they never include a value (token, URL, ...).
 */
export function parseBotConfig(
  source: Record<string, string | undefined>,
): BotConfig {
  const problems: string[] = [];

  const base = schema.safeParse({
    DISCORD_BOT_TOKEN: nonEmpty(source.DISCORD_BOT_TOKEN),
    DATABASE_URL: nonEmpty(source.DATABASE_URL),
  });
  if (!base.success) {
    for (const issue of base.error.issues) problems.push(issue.message);
  }

  const { ids, invalidPositions } = parseAllowlist(
    source.DISCORD_GUILD_ALLOWLIST,
  );
  for (const position of invalidPositions) {
    problems.push(
      `DISCORD_GUILD_ALLOWLIST entry #${position} is not a valid server ID (17 to 20 digits)`,
    );
  }

  let heartbeatIntervalMs = BOT_HEARTBEAT_DEFAULT_INTERVAL_MS;
  const rawInterval = nonEmpty(source.BOT_HEARTBEAT_INTERVAL_MS);
  if (rawInterval !== undefined) {
    const parsed = /^\d+$/.test(rawInterval) ? Number(rawInterval) : NaN;
    if (
      !Number.isInteger(parsed) ||
      parsed < MIN_HEARTBEAT_INTERVAL_MS ||
      parsed > MAX_HEARTBEAT_INTERVAL_MS
    ) {
      problems.push(
        `BOT_HEARTBEAT_INTERVAL_MS must be an integer between ${MIN_HEARTBEAT_INTERVAL_MS} and ${MAX_HEARTBEAT_INTERVAL_MS}`,
      );
    } else {
      heartbeatIntervalMs = parsed;
    }
  }

  let retentionDays = DEFAULT_RETENTION_DAYS;
  const rawRetention = nonEmpty(source.MESSAGE_EVENT_RETENTION_DAYS);
  if (rawRetention !== undefined) {
    const parsed = /^\d+$/.test(rawRetention) ? Number(rawRetention) : NaN;
    if (
      !Number.isInteger(parsed) ||
      parsed < MIN_RETENTION_DAYS ||
      parsed > MAX_RETENTION_DAYS
    ) {
      problems.push(
        `MESSAGE_EVENT_RETENTION_DAYS must be an integer between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS}`,
      );
    } else {
      retentionDays = parsed;
    }
  }

  if (problems.length > 0 || !base.success) throw new BotConfigError(problems);

  return {
    token: base.data.DISCORD_BOT_TOKEN,
    databaseUrl: base.data.DATABASE_URL,
    allowlist: ids,
    heartbeatIntervalMs,
    retentionDays,
  };
}
