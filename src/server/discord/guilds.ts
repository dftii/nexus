import "server-only";

import { getDb } from "@/server/db";
import { fetchCurrentUserGuilds, type FetchGuildsOptions } from "./api";
import { buildGuildIconUrl } from "./cdn";
import { type EligibilityReason, getEligibility } from "./permissions";
import { getValidDiscordAccessToken, type TokenOptions } from "./tokens";

/** A guild the user may manage, annotated with what NEXUS knows about it. */
export interface EligibleGuild {
  /** Discord guild id (snowflake string). */
  id: string;
  name: string;
  iconUrl: string | null;
  /** Why the user may manage it. */
  reason: EligibilityReason;
  /** True when the guild is already registered as a NEXUS community. */
  inNexus: boolean;
  /** NEXUS community id, when registered. */
  communityId: string | null;
  /** True when the NEXUS bot is connected (always false until Phase 3). */
  botConnected: boolean;
  /** True when this user already has a membership in the community. */
  alreadySelected: boolean;
}

export type EligibleGuildsResult =
  | { status: "ok"; guilds: EligibleGuild[] }
  | { status: "reauth_required" }
  | { status: "rate_limited"; retryAfter: number }
  | { status: "unavailable" };

export interface GuildServiceOptions {
  tokens?: TokenOptions;
  api?: FetchGuildsOptions;
}

const REASON_ORDER: Record<EligibilityReason, number> = {
  owner: 0,
  administrator: 1,
  manage_server: 2,
};

/**
 * Guilds the signed-in user can manage in NEXUS (owner, Administrator or
 * Manage Server), fetched live from Discord with the user's own token.
 * Never throws: every failure is a `status`.
 */
export async function getEligibleGuilds(
  userId: string,
  options: GuildServiceOptions = {},
): Promise<EligibleGuildsResult> {
  try {
    const token = await getValidDiscordAccessToken(userId, options.tokens);
    if (!token.ok) {
      return token.reason === "reauth_required"
        ? { status: "reauth_required" }
        : { status: "unavailable" };
    }

    const result = await fetchCurrentUserGuilds(token.accessToken, options.api);
    if (!result.ok) {
      switch (result.kind) {
        case "unauthorized":
          return { status: "reauth_required" };
        case "rate_limited":
          return { status: "rate_limited", retryAfter: result.retryAfter };
        default:
          return { status: "unavailable" };
      }
    }

    const eligible = result.guilds.flatMap((guild) => {
      const reason = getEligibility(guild);
      return reason ? [{ guild, reason }] : [];
    });
    if (eligible.length === 0) return { status: "ok", guilds: [] };

    const db = getDb();
    const communities = await db.community.findMany({
      where: { discordGuildId: { in: eligible.map((e) => e.guild.id) } },
      select: {
        id: true,
        discordGuildId: true,
        botConnectedAt: true,
        memberships: { where: { userId }, select: { id: true } },
      },
    });
    const byGuild = new Map(communities.map((c) => [c.discordGuildId, c]));

    const guilds = eligible
      .map<EligibleGuild>(({ guild, reason }) => {
        const community = byGuild.get(guild.id);
        return {
          id: guild.id,
          name: guild.name,
          iconUrl: buildGuildIconUrl(guild.id, guild.icon),
          reason,
          inNexus: Boolean(community),
          communityId: community?.id ?? null,
          botConnected: community?.botConnectedAt != null,
          alreadySelected: (community?.memberships.length ?? 0) > 0,
        };
      })
      .sort(
        (a, b) =>
          REASON_ORDER[a.reason] - REASON_ORDER[b.reason] ||
          a.name.localeCompare(b.name),
      );
    return { status: "ok", guilds };
  } catch {
    // Database or unexpected failure: report it as unavailable rather than
    // leaking details (or token material) through an error page.
    return { status: "unavailable" };
  }
}
