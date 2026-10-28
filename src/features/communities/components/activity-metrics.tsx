import { MessageSquareOff } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { StatCard } from "@/components/common/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTimeUtc, formatLongDate, formatNumber } from "@/lib/format";
import type {
  CommunityActivitySummary,
  RecentActivityItem,
} from "@/server/activity";

function Id({ value }: { value: string }) {
  return (
    <span title={value} className="font-mono text-xs break-all">
      {value}
    </span>
  );
}

/** Real counts for the installed bot. No deltas: there is nothing to compare. */
export function ActivityMetrics({
  summary,
  collectingSince,
}: {
  summary: CommunityActivitySummary;
  collectingSince: Date | null;
}) {
  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <h3 id="activity-heading" className="text-sm font-medium">
        Message activity
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Messages recorded"
          value={formatNumber(summary.totalEvents)}
          hint={
            collectingSince
              ? `Since ${formatLongDate(collectingSince)}`
              : "Since collection started"
          }
        />
        <StatCard
          label="Last 24 hours"
          value={formatNumber(summary.last24h)}
          hint="Messages in the last 24 hours"
        />
        <StatCard
          label="Last 7 days"
          value={formatNumber(summary.last7d)}
          hint="Messages in the last 7 days"
        />
        <StatCard
          label="Active authors"
          value={formatNumber(summary.activeAuthors7d)}
          hint="Distinct authors, last 7 days"
        />
      </div>
    </section>
  );
}

/** Newest recorded messages: ids and time only, there is no text to show. */
export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <section aria-labelledby="recent-heading" className="space-y-3">
      <h3 id="recent-heading" className="text-sm font-medium">
        Recent activity
      </h3>
      {items.length === 0 ? (
        <EmptyState
          icon={MessageSquareOff}
          title="No messages recorded yet"
          description="Send a message in a channel the bot can see."
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <ul className="divide-y">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-6"
                >
                  <time
                    dateTime={item.occurredAt.toISOString()}
                    className="shrink-0 tabular-nums sm:w-40"
                  >
                    {formatDateTimeUtc(item.occurredAt)}
                  </time>
                  <span className="flex flex-wrap items-center gap-x-6 gap-y-1 text-muted-foreground">
                    <span>
                      Channel <Id value={item.channelId} />
                    </span>
                    <span>
                      Author <Id value={item.authorId} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
