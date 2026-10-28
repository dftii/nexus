import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { getUserCommunity, listUserCommunities } from "./queries";
import type { UserCommunity } from "./types";

/** httpOnly cookie holding the id of the community the user is working in. */
export const ACTIVE_COMMUNITY_COOKIE = "nexus_community";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const MAX_COOKIE_VALUE_LENGTH = 64;

/** Remember `communityId` as the active community (server actions only). */
export async function setActiveCommunityCookie(
  communityId: string,
): Promise<void> {
  (await cookies()).set(ACTIVE_COMMUNITY_COOKIE, communityId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}

export async function clearActiveCommunityCookie(): Promise<void> {
  (await cookies()).delete(ACTIVE_COMMUNITY_COOKIE);
}

/**
 * The community the user is working in. The cookie is only a hint: its value
 * is checked against the user's memberships on every call, so a forged or
 * stale id (someone else's community, or one the user left) is ignored. Falls
 * back to the most recently joined membership, then to null.
 */
export const getActiveCommunity = cache(
  async (userId: string): Promise<UserCommunity | null> => {
    const hint = (await cookies()).get(ACTIVE_COMMUNITY_COOKIE)?.value;
    if (hint && hint.length <= MAX_COOKIE_VALUE_LENGTH) {
      const community = await getUserCommunity(userId, hint);
      if (community) return community;
    }
    const [latest] = await listUserCommunities(userId);
    return latest ?? null;
  },
);
