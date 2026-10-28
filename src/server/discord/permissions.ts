/**
 * Discord permission bit helpers. Permissions arrive as decimal strings that
 * can exceed 2^53, so they are always handled as BigInt, never Number.
 */
export const ADMINISTRATOR = 1n << 3n;
export const MANAGE_GUILD = 1n << 5n;

/** Why a user may manage a guild. Ordered by strength. */
export type EligibilityReason = "owner" | "administrator" | "manage_server";

/**
 * Parse a Discord permission bitfield. Digits only; anything else (empty,
 * signs, decimals, hex, whitespace) is treated as "no permissions" (0n) so a
 * malformed value can never grant access.
 */
export function parsePermissions(value: unknown): bigint {
  if (typeof value !== "string" || !/^\d{1,40}$/.test(value)) return 0n;
  return BigInt(value);
}

export function hasPermission(permissions: bigint, flag: bigint): boolean {
  return (permissions & flag) === flag;
}

/**
 * Whether the user can manage the guild in NEXUS: they own it, have the
 * Administrator permission, or have Manage Server. Returns the strongest
 * reason, or null when not eligible.
 */
export function getEligibility(guild: {
  owner: boolean;
  permissions: string;
}): EligibilityReason | null {
  if (guild.owner) return "owner";
  const permissions = parsePermissions(guild.permissions);
  if (hasPermission(permissions, ADMINISTRATOR)) return "administrator";
  if (hasPermission(permissions, MANAGE_GUILD)) return "manage_server";
  return null;
}

export function isEligibleGuild(guild: {
  owner: boolean;
  permissions: string;
}): boolean {
  return getEligibility(guild) !== null;
}
