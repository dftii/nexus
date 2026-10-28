import { ChartCard } from "@/components/common/chart-card";
import { SrDataTable } from "@/components/common/sr-data-table";
import { formatLongDate, formatNumber } from "@/lib/format";
import { sum } from "../lib/delta";
import type { MessagePoint } from "../types";
import { MessageActivityChart } from "./message-activity-chart";

/** Activity over time: messages per day. */
export function MessagesCard({
  data,
  isDemo,
  className,
}: {
  data: readonly MessagePoint[];
  isDemo: boolean;
  className?: string;
}) {
  const label = isDemo ? "Messages (demo)" : "Messages";
  let summary = "No message activity is available.";
  if (data.length > 0) {
    const peak = data.reduce((a, b) => (b.messages > a.messages ? b : a));
    const low = data.reduce((a, b) => (b.messages < a.messages ? b : a));
    const average = Math.round(sum(data.map((p) => p.messages)) / data.length);
    summary = `Messages per day over ${data.length} days: average ${formatNumber(average)}, highest ${formatNumber(peak.messages)} on ${formatLongDate(peak.date)}, lowest ${formatNumber(low.messages)} on ${formatLongDate(low.date)}.${isDemo ? " Demo data." : ""}`;
  }

  return (
    <ChartCard
      className={className}
      title={isDemo ? "Activity (demo)" : "Activity"}
      description={`Messages per day, last ${data.length} days`}
      summary={summary}
      table={
        <SrDataTable
          caption="Messages per day"
          columns={["Date", label]}
          rows={data.map((point) => [
            formatLongDate(point.date),
            formatNumber(point.messages),
          ])}
        />
      }
    >
      <MessageActivityChart data={data} label={label} />
    </ChartCard>
  );
}
