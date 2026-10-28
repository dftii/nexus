import type { OverviewData } from "@/server/activity";
import { ActivityMetrics, RecentActivity } from "./activity-metrics";
import { AutoRefresh } from "./auto-refresh";
import { BotInstallPanel } from "./bot-install-panel";
import { BotStatusPanel } from "./bot-status";
import { CommunityHeader } from "./community-header";

/**
 * The Overview for a real community, driven by the bot's real state:
 * - not installed: how to install it (no numbers, nothing is collected);
 * - offline / online: heartbeat facts plus the metrics collected so far.
 * It never renders demo data: that lives only on `/demo`. While anything is
 * on screen it refreshes itself every 30 s.
 */
export function CommunityOverview({
  data,
  inviteUrl,
  now,
}: {
  data: Extract<OverviewData, { status: "ok" }>;
  inviteUrl: string | null;
  now: Date;
}) {
  const { community, bot, activity } = data;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <CommunityHeader community={community} botStatus={bot.status} />

      {bot.status === "not_installed" || !activity ? (
        <BotInstallPanel
          communityName={community.name}
          discordGuildId={community.discordGuildId}
          inviteUrl={inviteUrl}
        />
      ) : (
        <>
          <BotStatusPanel
            status={bot.status}
            connectedAt={bot.connectedAt}
            lastSeenAt={bot.lastSeenAt}
            now={now}
          />
          <ActivityMetrics
            summary={activity.summary}
            collectingSince={bot.connectedAt}
          />
          <RecentActivity items={activity.recent} />
        </>
      )}
      <AutoRefresh />
    </div>
  );
}
