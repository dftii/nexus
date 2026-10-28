import { StatCard, type StatChange } from "@/components/common/stat-card";
import {
  formatNumber,
  formatSignedNumber,
  formatSignedPercent,
} from "@/lib/format";
import type { Metric } from "../types";

/**
 * Turn a metric's delta into the StatCard change line. Snapshot metrics
 * (a count on a given day) compare against the value `periodDays` ago;
 * sum metrics compare against the previous period of the same length.
 */
export function toStatChange(
  metric: Metric,
  periodDays: number,
  kind: "snapshot" | "sum",
): StatChange {
  const { delta } = metric;
  return {
    direction: delta.direction,
    text:
      delta.ratio === null
        ? formatSignedNumber(delta.absolute)
        : formatSignedPercent(delta.ratio),
    comparison:
      kind === "snapshot"
        ? `vs ${periodDays} days ago`
        : `vs previous ${periodDays} days`,
  };
}

interface SummaryStatsProps {
  summary: {
    totalMembers: Metric;
    activeMembers: Metric;
    messages: Metric;
    newMembers: Metric;
  };
  periodDays: number;
  isDemo: boolean;
}

/** Row of key metrics. */
export function SummaryStats({
  summary,
  periodDays,
  isDemo,
}: SummaryStatsProps) {
  const cards = [
    {
      key: "total",
      label: "Total members",
      hint: "Everyone currently in the server",
      metric: summary.totalMembers,
      kind: "snapshot",
    },
    {
      key: "active",
      label: "Active members",
      hint: "Sent a message in the last 7 days",
      metric: summary.activeMembers,
      kind: "snapshot",
    },
    {
      key: "messages",
      label: isDemo ? "Messages (demo)" : "Messages",
      hint: `Sent in the last ${periodDays} days`,
      metric: summary.messages,
      kind: "sum",
    },
    {
      key: "new",
      label: "New members",
      hint: `Joined in the last ${periodDays} days`,
      metric: summary.newMembers,
      kind: "sum",
    },
  ] as const;

  return (
    <section aria-labelledby="key-metrics-heading">
      <h2 id="key-metrics-heading" className="sr-only">
        Key metrics
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, label, hint, metric, kind }) => (
          <StatCard
            key={key}
            label={label}
            value={formatNumber(metric.value)}
            hint={hint}
            change={toStatChange(metric, periodDays, kind)}
          />
        ))}
      </div>
    </section>
  );
}
