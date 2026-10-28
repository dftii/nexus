import { redirect } from "next/navigation";
import { navMetadata } from "@/config/navigation";
import { AnalyticsView } from "@/features/analytics/components/analytics-view";
import { OverviewUnavailable } from "@/features/communities/components/overview-unavailable";
import { buildBotInviteUrl } from "@/lib/discord-invite";
import { getAuthEnv, isAuthConfigured } from "@/lib/env";
import { getAnalyticsData, parseRange } from "@/server/activity";
import { requireUser } from "@/server/auth";

export const metadata = navMetadata("/analytics");

/**
 * Analytics for the user's active community. The community is never read from
 * the URL: only `?range=7|30|90` is, validated (anything else is 30 days).
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const user = await requireUser();
  const range = parseRange((await searchParams).range);
  const now = new Date();
  const data = await getAnalyticsData(user.id, range, now);
  if (!data) redirect("/onboarding");
  if (data.status === "error") {
    return (
      <OverviewUnavailable
        community={data.community}
        href={`/analytics?range=${range}`}
      />
    );
  }

  const inviteUrl = isAuthConfigured()
    ? buildBotInviteUrl({
        clientId: getAuthEnv().AUTH_DISCORD_ID,
        guildId: data.community.discordGuildId,
      })
    : null;
  return <AnalyticsView data={data} inviteUrl={inviteUrl} now={now} />;
}
