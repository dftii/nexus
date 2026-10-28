import type { CommunityRole } from "@/generated/prisma/enums";

/** A community as seen by one of its members. */
export interface UserCommunity {
  id: string;
  discordGuildId: string;
  name: string;
  iconUrl: string | null;
  /** The viewer's role in it. */
  role: CommunityRole;
  /** True once the NEXUS bot is connected (always false until Phase 3). */
  botConnected: boolean;
}

export type SelectCommunityResult =
  | { status: "ok"; communityId: string }
  | { status: "invalid" }
  | { status: "forbidden" }
  | { status: "reauth_required" }
  | { status: "rate_limited"; retryAfter: number }
  | { status: "unavailable" }
  | { status: "db_error" };
