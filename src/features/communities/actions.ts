"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import {
  getUserCommunity,
  selectCommunity,
  setActiveCommunityCookie,
} from "@/server/communities";
import type { SelectCommunityErrorCode, SelectCommunityState } from "./types";

const MESSAGES: Record<SelectCommunityErrorCode, string> = {
  invalid: "That server isn't valid. Pick one from the list.",
  forbidden:
    "You need to be the owner, an administrator, or have the Manage Server permission to use that server in NEXUS.",
  reauth_required:
    "Your Discord authorization expired. Sign in with Discord again to continue.",
  rate_limited: "Discord is asking us to slow down. Try again in a moment.",
  unavailable: "We couldn't reach Discord. Try again in a moment.",
  db_error: "We couldn't save your selection. Try again in a moment.",
};

/**
 * Server action: choose the community to manage. For `useActionState`; the
 * form must contain a `guildId` field (the Discord server id).
 *
 * The user is taken from the session (never from the form) and the guild is
 * re-verified against Discord on the server. On success it sets the
 * `nexus_community` cookie and redirects to `/`.
 */
export async function selectCommunityAction(
  _previous: SelectCommunityState,
  formData: FormData,
): Promise<SelectCommunityState> {
  const user = await requireUser();
  const result = await selectCommunity(user.id, formData.get("guildId"));

  if (result.status !== "ok") {
    return {
      status: "error",
      code: result.status,
      message: MESSAGES[result.status],
      ...(result.status === "rate_limited"
        ? { retryAfter: result.retryAfter }
        : {}),
    };
  }

  await setActiveCommunityCookie(result.communityId);
  redirect("/");
}

const MAX_COMMUNITY_ID_LENGTH = 64;

/**
 * Server action: switch to another community the user already belongs to
 * (header menu). Unlike `selectCommunityAction` it makes no Discord call; the
 * only thing it trusts is the membership table. The id from the form is looked
 * up through the signed-in user's own membership, so an id that belongs to
 * someone else's community (or does not exist) changes nothing. Always ends
 * on `/`, which shows whichever community is active.
 */
export async function switchActiveCommunityAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const communityId = formData.get("communityId");
  if (
    typeof communityId === "string" &&
    communityId.length > 0 &&
    communityId.length <= MAX_COMMUNITY_ID_LENGTH
  ) {
    const community = await getUserCommunity(user.id, communityId);
    if (community) await setActiveCommunityCookie(community.id);
  }
  redirect("/");
}
