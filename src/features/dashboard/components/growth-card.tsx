import { ChartCard } from "@/components/common/chart-card";
import { SrDataTable } from "@/components/common/sr-data-table";
import { formatLongDate, formatNumber, formatSignedNumber } from "@/lib/format";
import { paddedDomain } from "../lib/chart";
import type { MembershipPoint } from "../types";
import { MembershipGrowthChart } from "./membership-growth-chart";

/** Membership growth: total members per day over the available history. */
export function GrowthCard({
  data,
  isDemo,
  className,
}: {
  data: readonly MembershipPoint[];
  isDemo: boolean;
  className?: string;
}) {
  const first = data[0];
  const last = data[data.length - 1];
  const [lower, upper] = paddedDomain(
    data.map((point) => point.members),
    500,
  );

  const summary =
    first && last
      ? `Total members went from ${formatNumber(first.members)} on ${formatLongDate(first.date)} to ${formatNumber(last.members)} on ${formatLongDate(last.date)}, a net change of ${formatSignedNumber(last.members - first.members)} over ${data.length} days.${isDemo ? " Demo data." : ""}`
      : "No membership data is available.";

  return (
    <ChartCard
      className={className}
      title={isDemo ? "Membership growth (demo)" : "Membership growth"}
      description={`Total members per day, last ${data.length} days`}
      summary={summary}
      footnote={`Vertical axis starts at ${formatNumber(lower)}, not zero, to make daily change visible.`}
      table={
        <SrDataTable
          caption="Total members, joins and leaves per day"
          columns={["Date", "Total members", "Joins", "Leaves"]}
          rows={data.map((point) => [
            formatLongDate(point.date),
            formatNumber(point.members),
            formatNumber(point.joins),
            formatNumber(point.leaves),
          ])}
        />
      }
    >
      <MembershipGrowthChart data={data} yDomain={[lower, upper]} />
    </ChartCard>
  );
}
