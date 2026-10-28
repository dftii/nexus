import { redirect } from "next/navigation";
import { navMetadata } from "@/config/navigation";
import { CommunityOverview } from "@/features/communities/components/community-overview";
import { OverviewUnavailable } from "@/features/communities/components/overview-unavailable";
import { buildBotInviteUrl } from "@/lib/discord-invite";
import { getAuthEnv, isAuthConfigured } from "@/lib/env";
import { getOverviewData } from "@/server/activity";
import { requireUser } from "@/server/auth";

export const metadata = navMetadata("/");

/**
 * Authenticated entry point. No community yet -> onboarding. With one, the
 * real state of its bot and the activity it recorded. This page never renders
 * demo data: that lives at `/demo`.
 */
export default async function OverviewPage() {
  const user = await requireUser();
  const now = new Date();
  const data = await getOverviewData(user.id, now);
  if (!data) redirect("/onboarding");
  if (data.status === "error") {
    return <OverviewUnavailable community={data.community} />;
  }

  const inviteUrl = isAuthConfigured()
    ? buildBotInviteUrl({
        clientId: getAuthEnv().AUTH_DISCORD_ID,
        guildId: data.community.discordGuildId,
      })
    : null;
  return <CommunityOverview data={data} inviteUrl={inviteUrl} now={now} />;
}
