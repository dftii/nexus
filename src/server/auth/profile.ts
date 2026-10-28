import { z } from "zod";
import { buildAvatarUrl } from "@/server/discord/cdn";

/** Subset of Discord's `/users/@me` response (scope `identify`) we rely on. */
const discordProfileSchema = z.object({
  id: z.string().regex(/^\d{17,20}$/),
  username: z.string().min(1),
  global_name: z.string().nullish(),
  avatar: z.string().nullish(),
});

export type DiscordProfileInput = z.input<typeof discordProfileSchema>;

/**
 * The user as the Auth.js Prisma adapter's `createUser` receives it. Every key
 * is a column of the `users` table, so the adapter can insert it as is:
 * `discordId`/`username`/`displayName`/`avatarUrl` are NEXUS' own columns,
 * `name`/`image` are the ones Auth.js expects. `email` is always null because
 * the `email` scope is never requested.
 */
export interface MappedDiscordUser {
  id: string;
  discordId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  name: string;
  image: string | null;
  email: null;
}

/** Map a Discord profile to the NEXUS user shape. Throws if it is malformed. */
export function mapDiscordProfile(profile: unknown): MappedDiscordUser {
  const p = discordProfileSchema.parse(profile);
  const displayName = p.global_name ?? null;
  const avatarUrl = buildAvatarUrl(p.id, p.avatar);
  return {
    id: p.id,
    discordId: p.id,
    username: p.username,
    displayName,
    avatarUrl,
    name: displayName ?? p.username,
    image: avatarUrl,
    email: null,
  };
}
