import "server-only";

import { getDb } from "@/server/db";
import type { UserCommunity } from "./types";

/**
 * Tenant isolation: every community read goes through a membership row of the
 * given user. There is deliberately no "get community by id" without a user.
 */

const communitySelect = {
  role: true,
  community: {
    select: {
      id: true,
      discordGuildId: true,
      name: true,
      iconUrl: true,
      botConnectedAt: true,
    },
  },
} as const;

interface Row {
  role: UserCommunity["role"];
  community: {
    id: string;
    discordGuildId: string;
    name: string;
    iconUrl: string | null;
    botConnectedAt: Date | null;
  };
}

function toUserCommunity({ role, community }: Row): UserCommunity {
  return {
    id: community.id,
    discordGuildId: community.discordGuildId,
    name: community.name,
    iconUrl: community.iconUrl,
    role,
    botConnected: community.botConnectedAt !== null,
  };
}

/** Communities the user belongs to, most recently joined first. */
export async function listUserCommunities(
  userId: string,
): Promise<UserCommunity[]> {
  const rows = await getDb().communityMembership.findMany({
    where: { userId },
    orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
    select: communitySelect,
  });
  return rows.map(toUserCommunity);
}

/** The community, only if `userId` has a membership in it; otherwise null. */
export async function getUserCommunity(
  userId: string,
  communityId: string,
): Promise<UserCommunity | null> {
  const row = await getDb().communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId } },
    select: communitySelect,
  });
  return row ? toUserCommunity(row) : null;
}
