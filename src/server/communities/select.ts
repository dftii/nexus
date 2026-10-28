import "server-only";

import { CommunityRole } from "@/generated/prisma/enums";
import { getDb } from "@/server/db";
import { snowflakeSchema } from "@/server/discord/api";
import { getEligibleGuilds, type EligibleGuild } from "@/server/discord/guilds";
import type { SelectCommunityResult } from "./types";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function persist(userId: string, guild: EligibleGuild, now: Date) {
  const isOwner = guild.reason === "owner";
  return getDb().$transaction(async (tx) => {
    const existing = await tx.community.findUnique({
      where: { discordGuildId: guild.id },
      select: { ownerId: true },
    });
    const community = await tx.community.upsert({
      where: { discordGuildId: guild.id },
      create: {
        discordGuildId: guild.id,
        name: guild.name,
        iconUrl: guild.iconUrl,
        ownerId: isOwner ? userId : null,
      },
      update: {
        name: guild.name,
        iconUrl: guild.iconUrl,
        // Claim ownership only when the guild has no known owner yet.
        ...(isOwner && !existing?.ownerId ? { ownerId: userId } : {}),
      },
      select: { id: true },
    });

    const membership = await tx.communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId: community.id } },
      select: { role: true },
    });
    // Role mirrors Discord: the owner is OWNER, every other eligible user is
    // ADMIN. A former owner is demoted; other existing roles are kept.
    let role: CommunityRole = isOwner
      ? CommunityRole.OWNER
      : CommunityRole.ADMIN;
    if (membership && !isOwner && membership.role !== CommunityRole.OWNER) {
      role = membership.role;
    }

    await tx.communityMembership.upsert({
      where: { userId_communityId: { userId, communityId: community.id } },
      create: { userId, communityId: community.id, role, lastVerifiedAt: now },
      update: { role, lastVerifiedAt: now },
    });
    return community.id;
  });
}

/**
 * Register the guild as a NEXUS community (if needed) and add the user to it.
 *
 * Security: `guildId` comes from the browser and is never trusted. The user's
 * guild list is re-fetched from Discord with their own token and the guild must
 * be in it with owner / Administrator / Manage Server. Only the caller's own
 * membership row is written; other users' rows are never touched.
 * Idempotent: selecting the same guild again changes nothing but
 * `lastVerifiedAt`.
 */
export async function selectCommunity(
  userId: string,
  guildId: unknown,
): Promise<SelectCommunityResult> {
  const parsed = snowflakeSchema.safeParse(guildId);
  if (!parsed.success) return { status: "invalid" };

  const guilds = await getEligibleGuilds(userId);
  if (guilds.status !== "ok") {
    return guilds.status === "rate_limited"
      ? { status: "rate_limited", retryAfter: guilds.retryAfter }
      : { status: guilds.status };
  }
  const guild = guilds.guilds.find((g) => g.id === parsed.data);
  if (!guild) return { status: "forbidden" };

  const now = new Date();
  try {
    try {
      return { status: "ok", communityId: await persist(userId, guild, now) };
    } catch (error) {
      // Two first-time selections of the same guild can race on the unique
      // discord_guild_id; the loser's transaction aborts. Retry it once.
      if (!isUniqueViolation(error)) throw error;
      return { status: "ok", communityId: await persist(userId, guild, now) };
    }
  } catch {
    return { status: "db_error" };
  }
}
