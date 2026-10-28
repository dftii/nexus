import type { Metadata } from "next";
import { OnboardingView } from "@/features/communities/components/onboarding-view";
import { requireUser } from "@/server/auth";
import { getActiveCommunity } from "@/server/communities";
import { getEligibleGuilds } from "@/server/discord/guilds";

export const metadata: Metadata = {
  title: "Choose a server",
  description: "Pick the Discord server you want to manage with NEXUS.",
};

/**
 * Lists the servers the user can manage (checked live against Discord, with
 * the user's own token) and lets them connect or select one.
 */
export default async function OnboardingPage() {
  const user = await requireUser();
  const [result, active] = await Promise.all([
    getEligibleGuilds(user.id),
    getActiveCommunity(user.id),
  ]);
  return (
    <OnboardingView result={result} activeCommunityId={active?.id ?? null} />
  );
}
