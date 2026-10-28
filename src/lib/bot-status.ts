/**
 * Bot connection status, shared by the web app (to render it) and documented
 * next to the bot (which writes the fields). No `server-only`, no discord.js,
 * no I/O: pure functions over two timestamps.
 *
 * Field semantics (written only by the bot process, `src/bot`):
 * - `botConnectedAt`: first time the Gateway confirmed the bot is present in
 *   the guild for the current installation (= when activity collection
 *   started). `null` = not installed (never seen, or removed from the guild).
 * - `botLastSeenAt`: last heartbeat that included the guild.
 */

/** Heartbeat interval default; the bot beats once per interval. */
export const BOT_HEARTBEAT_DEFAULT_INTERVAL_MS = 60_000;

/**
 * A heartbeat older than this means the bot process is considered offline.
 * It is three default intervals, so one or two missed beats are tolerated.
 */
export const BOT_HEARTBEAT_STALE_AFTER_MS = 3 * 60_000;

export type BotStatus = "not_installed" | "offline" | "online";

export interface BotStatusFields {
  botConnectedAt: Date | null;
  botLastSeenAt: Date | null;
}

/**
 * - `not_installed`: `botConnectedAt` is null.
 * - `online`: installed and the last heartbeat is at most
 *   `BOT_HEARTBEAT_STALE_AFTER_MS` old (exactly at the threshold is still
 *   online; a heartbeat dated in the future, from clock skew, counts as fresh).
 * - `offline`: installed but never beat, or the last beat is stale.
 */
export function getBotStatus(
  { botConnectedAt, botLastSeenAt }: BotStatusFields,
  now: Date = new Date(),
): BotStatus {
  if (!botConnectedAt) return "not_installed";
  if (!botLastSeenAt) return "offline";
  const age = now.getTime() - botLastSeenAt.getTime();
  return age <= BOT_HEARTBEAT_STALE_AFTER_MS ? "online" : "offline";
}
