import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/format";
import type { ChannelRow, RangeDays } from "@/server/activity";

export const CHANNEL_TABLE_ROWS = 25;

/** Messages per channel with share of the total; names fall back to the id. */
export function ChannelTable({
  channels,
  range,
}: {
  channels: readonly ChannelRow[];
  range: RangeDays;
}) {
  const shown = channels.slice(0, CHANNEL_TABLE_ROWS);
  return (
    <Card role="region" aria-labelledby="channels-heading" className="min-w-0">
      <CardHeader>
        <CardTitle id="channels-heading">Channels</CardTitle>
        <p className="text-sm text-muted-foreground">
          Messages per channel, last {range} days (UTC)
        </p>
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No channel activity in this range"
            description="Channels appear here once they have recorded messages."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Messages per channel, last {range} days
              </caption>
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Channel
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Messages
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Share
                  </th>
                  <th scope="col" className="py-2 pl-4 text-right font-medium">
                    Authors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((c) => (
                  <tr key={c.channelId}>
                    <th
                      scope="row"
                      className="max-w-56 truncate py-2 pr-4 text-left font-medium"
                    >
                      {c.name ? (
                        <span title={c.channelId}>#{c.name}</span>
                      ) : (
                        <span
                          className="font-mono text-xs"
                          title="Name not stored"
                        >
                          {c.channelId}
                        </span>
                      )}
                    </th>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatNumber(c.messages)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatPercent(c.share)}
                    </td>
                    <td className="py-2 pl-4 text-right tabular-nums">
                      {c.authors === null ? (
                        <span title="Not available for ranges over 30 days">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">not available</span>
                        </span>
                      ) : (
                        formatNumber(c.authors)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {channels.length > shown.length ? (
          <p className="pt-3 text-xs text-muted-foreground">
            Showing the top {shown.length} of {channels.length} channels.
          </p>
        ) : null}
        {range > 30 && shown.length > 0 ? (
          <p className="pt-3 text-xs text-muted-foreground">
            Distinct authors per channel are only available for 7 and 30 day
            ranges.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
