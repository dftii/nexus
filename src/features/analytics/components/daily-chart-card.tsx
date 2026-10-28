import { ChartCard } from "@/components/common/chart-card";
import { SrDataTable } from "@/components/common/sr-data-table";
import { MessageActivityChart } from "@/features/dashboard/components/message-activity-chart";
import { formatLongDate, formatNumber } from "@/lib/format";
import type { DailyPoint } from "@/server/activity";

/** A per-UTC-day bar chart of one `DailyPoint` field, with a text summary and data table. */
export function DailyChartCard({
  title,
  description,
  data,
  dataKey,
  label,
  color,
  footnote,
}: {
  title: string;
  description: string;
  data: readonly DailyPoint[];
  dataKey: "messages" | "authors";
  label: string;
  color: string;
  footnote?: string;
}) {
  let summary = "No data is available.";
  if (data.length > 0) {
    const values = data.map((p) => p[dataKey]);
    const peak = data.reduce((a, b) => (b[dataKey] > a[dataKey] ? b : a));
    const average = Math.round(values.reduce((a, b) => a + b, 0) / data.length);
    summary = `${label} per UTC day over ${data.length} days: average ${formatNumber(average)}, highest ${formatNumber(peak[dataKey])} on ${formatLongDate(peak.date)}.`;
  }
  return (
    <ChartCard
      title={title}
      description={description}
      summary={summary}
      footnote={footnote}
      table={
        <SrDataTable
          caption={`${label} per UTC day`}
          columns={["Date", label]}
          rows={data.map((p) => [
            formatLongDate(p.date),
            formatNumber(p[dataKey]),
          ])}
        />
      }
    >
      <MessageActivityChart
        data={data}
        label={label}
        dataKey={dataKey}
        color={color}
      />
    </ChartCard>
  );
}
