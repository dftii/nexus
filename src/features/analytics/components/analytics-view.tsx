import { BarChart3, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { StatCard } from "@/components/common/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoRefresh } from "@/features/communities/components/auto-refresh";
import { BotInstallPanel } from "@/features/communities/components/bot-install-panel";
import { BotStatusPanel } from "@/features/communities/components/bot-status";
import { CommunityHeader } from "@/features/communities/components/community-header";
import { RecentActivity } from "@/features/communities/components/activity-metrics";
import {
  formatDateTimeUtc,
  formatLongDate,
  formatNumber,
  formatRelativeTime,
} from "@/lib/format";
import type { AnalyticsActivity, AnalyticsData } from "@/server/activity";
import { ActivityHeatmap } from "./activity-heatmap";
import { ChannelTable } from "./channel-table";
import { DailyChartCard } from "./daily-chart-card";
import { RangeSelector } from "./range-selector";

function Kpis({ a }: { a: AnalyticsActivity }) {
  const { summary } = a;
  return (
    <section aria-labelledby="kpi-heading">
      <h3 id="kpi-heading" className="sr-only">
        Key numbers
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Messages recorded"
          value={formatNumber(summary.totalEvents)}
          hint="All time, since the bot started recording"
        />
        <StatCard
          label="Last 24 hours"
          value={formatNumber(summary.last24h)}
          hint="Messages in the last 24 hours"
        />
        <StatCard
          label="Last 7 days"
          value={formatNumber(summary.last7d)}
          hint="Today and the 6 previous UTC days"
        />
        <StatCard
          label="Active authors"
          value={formatNumber(summary.activeAuthors7d)}
          hint="Distinct authors, same 7 UTC days"
        />
        <StatCard
          label="Active channels"
          value={formatNumber(a.channels.length)}
          hint={`Channels with messages in the last ${a.range} days`}
        />
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Coverage({ a, now }: { a: AnalyticsActivity; now: Date }) {
  const { coverage, summary } = a;
  return (
    <Card role="region" aria-labelledby="coverage-heading">
      <CardHeader>
        <CardTitle id="coverage-heading">About this data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Fact
            label="Latest message"
            value={
              summary.lastEventAt
                ? `${formatDateTimeUtc(summary.lastEventAt)} (${formatRelativeTime(summary.lastEventAt, now)})`
                : "none yet"
            }
          />
          <Fact
            label="Daily totals updated"
            value={
              coverage.aggregatedAt
                ? `${formatDateTimeUtc(coverage.aggregatedAt)} (${formatRelativeTime(coverage.aggregatedAt, now)})`
                : "not yet"
            }
          />
          <Fact
            label="Daily totals through"
            value={
              coverage.finalizedThrough
                ? formatLongDate(coverage.finalizedThrough)
                : "none yet"
            }
          />
          <Fact
            label="Earliest daily total"
            value={
              coverage.earliestAggregateDay
                ? formatLongDate(coverage.earliestAggregateDay)
                : "none yet"
            }
          />
          <Fact
            label="Earliest recent message stored"
            value={
              coverage.earliestRawAt
                ? formatDateTimeUtc(coverage.earliestRawAt)
                : "none yet"
            }
          />
        </dl>
        <p className="text-xs text-muted-foreground">
          These numbers count recorded activity only: messages the bot saw while
          it was installed and running, not the full history of the server. A
          day with zero messages may mean the bot was offline. All days and
          times are UTC. Recent messages are read directly; older days come from
          daily totals that are kept after the individual messages are cleaned
          up.
        </p>
      </CardContent>
    </Card>
  );
}

function StaleNote({ a }: { a: AnalyticsActivity }) {
  return (
    <Card role="status" aria-label="Daily totals status">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TriangleAlert aria-hidden="true" className="size-4 text-warning" />
          Daily totals are catching up
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {a.coverage.finalizedThrough
            ? `Daily totals are final through ${formatLongDate(a.coverage.finalizedThrough)}.`
            : "Daily totals have not been computed yet."}{" "}
          The newer days below are read directly from recorded messages, so the
          numbers are still correct. The bot computes the totals every few
          minutes while it is running.
        </p>
      </CardHeader>
    </Card>
  );
}

/**
 * `/analytics` for a real community. States: bot not installed (install
 * panel), offline (banner, data collected so far), stale daily totals (note),
 * empty (nothing recorded yet) and the full dashboard. Never demo data.
 */
export function AnalyticsView({
  data,
  inviteUrl,
  now,
}: {
  data: Extract<AnalyticsData, { status: "ok" }>;
  inviteUrl: string | null;
  now: Date;
}) {
  const { community, bot, activity: a } = data;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <CommunityHeader community={community} botStatus={bot.status} />

      {bot.status === "not_installed" || !a ? (
        <BotInstallPanel
          communityName={community.name}
          discordGuildId={community.discordGuildId}
          inviteUrl={inviteUrl}
        />
      ) : (
        <>
          {bot.status === "offline" ? (
            <BotStatusPanel
              status="offline"
              connectedAt={bot.connectedAt}
              lastSeenAt={bot.lastSeenAt}
              now={now}
            />
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight">Analytics</h3>
            <RangeSelector range={a.range} />
          </div>
          {a.coverage.stale ? <StaleNote a={a} /> : null}
          {a.summary.totalEvents === 0 && a.recent.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No messages recorded yet"
              description="Analytics appear once the bot has recorded messages. Send a message in a channel the bot can see."
            />
          ) : (
            <>
              <Kpis a={a} />
              <div className="grid gap-4 lg:grid-cols-2">
                <DailyChartCard
                  title="Messages per day"
                  description={`Last ${a.range} days (UTC)`}
                  data={a.daily}
                  dataKey="messages"
                  label="Messages"
                  color="var(--chart-2)"
                />
                <DailyChartCard
                  title="Active authors per day"
                  description={`Distinct authors per UTC day, last ${a.range} days`}
                  data={a.daily}
                  dataKey="authors"
                  label="Authors"
                  color="var(--chart-3)"
                  footnote="Each day is counted on its own; days are not added together."
                />
              </div>
              <ChannelTable channels={a.channels} range={a.range} />
              <ActivityHeatmap heatmap={a.heatmap} days={a.heatmapDays} />
              <RecentActivity items={a.recent} />
              <Coverage a={a} now={now} />
            </>
          )}
        </>
      )}
      <AutoRefresh />
    </div>
  );
}
