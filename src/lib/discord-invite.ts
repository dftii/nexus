/**
 * Bot invitation link. Pure: no I/O, no secrets. The client id is the public
 * OAuth application id (`AUTH_DISCORD_ID`), the same value that appears in the
 * sign-in URL; the client secret and the bot token never reach this module.
 */

/**
 * Permission bit requested for the bot: `VIEW_CHANNEL` (1 << 10 = 1024), so the
 * Gateway delivers message events for the channels it can see. Nothing else:
 * no Send Messages, no Manage *, no Administrator, and the invite does not ask
 * for the `applications.commands` scope.
 */
export const BOT_INVITE_PERMISSIONS = 1024;

const AUTHORIZE_URL = "https://discord.com/oauth2/authorize";

/** Discord ids are snowflakes: 17 to 20 decimal digits. */
const SNOWFLAKE = /^\d{17,20}$/;

export function isSnowflake(value: string | null | undefined): value is string {
  return typeof value === "string" && SNOWFLAKE.test(value);
}

/**
 * Invite URL that pre-selects `guildId` (and locks the server picker) for the
 * application `clientId`. Returns null when either id is missing or not a
 * snowflake, e.g. when auth is not configured.
 */
export function buildBotInviteUrl({
  clientId,
  guildId,
}: {
  clientId: string | null | undefined;
  guildId: string | null | undefined;
}): string | null {
  if (!isSnowflake(clientId) || !isSnowflake(guildId)) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot",
    permissions: String(BOT_INVITE_PERMISSIONS),
    guild_id: guildId,
    disable_guild_select: "true",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}
