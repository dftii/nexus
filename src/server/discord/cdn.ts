/** Discord CDN URL builders. Pure: no I/O, safe to unit test. */
const CDN = "https://cdn.discordapp.com";
const HASH = /^[A-Za-z0-9_]+$/;
const SNOWFLAKE = /^\d{17,20}$/;

/** Guild icon (static PNG frame, also for animated `a_` hashes) or null. */
export function buildGuildIconUrl(
  guildId: string,
  icon: string | null | undefined,
): string | null {
  if (!icon || !HASH.test(icon) || !SNOWFLAKE.test(guildId)) return null;
  return `${CDN}/icons/${guildId}/${icon}.png?size=128`;
}

/**
 * Avatar URL for a user. Falls back to Discord's default avatar when none is
 * set (index derived from the id for the new username system, like Discord).
 */
export function buildAvatarUrl(
  userId: string,
  avatar: string | null | undefined,
): string | null {
  if (!SNOWFLAKE.test(userId)) return null;
  if (avatar && HASH.test(avatar)) {
    return `${CDN}/avatars/${userId}/${avatar}.png?size=128`;
  }
  const index = Number((BigInt(userId) >> 22n) % 6n);
  return `${CDN}/embed/avatars/${index}.png`;
}
