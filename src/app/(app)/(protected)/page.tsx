import { redirect } from "next/navigation";
import { navMetadata } from "@/config/navigation";
import { CommunityOverview } from "@/features/communities/components/community-overview";
import { requireUser } from "@/server/auth";
import { getActiveCommunity } from "@/server/communities";

export const metadata = navMetadata("/");

/**
 * Authenticated entry point. No community yet -> onboarding. With one, an
 * honest state for its connection status. This page never renders demo data:
 * that lives at `/demo`.
 */
export default async function OverviewPage() {
  const user = await requireUser();
  const community = await getActiveCommunity(user.id);
  if (!community) redirect("/onboarding");
  return <CommunityOverview community={community} />;
}
