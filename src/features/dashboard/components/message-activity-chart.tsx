"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  formatCompact,
  formatLongDate,
  formatNumber,
  formatShortDate,
} from "@/lib/format";
import type { MessagePoint } from "../types";

const config = {
  messages: { label: "Messages", color: "var(--chart-2)" },
} satisfies ChartConfig;

/** Messages per day as bars, zero-based. */
export function MessageActivityChart({
  data,
  label,
}: {
  data: readonly MessagePoint[];
  /** Series name shown in the tooltip, e.g. "Messages (demo)". */
  label: string;
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="No message activity yet"
        description="Daily message counts will appear here once data is available."
      />
    );
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart
        accessibilityLayer
        data={[...data]}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={formatShortDate}
        />
        <YAxis
          width={44}
          tickLine={false}
          axisLine={false}
          domain={[0, "auto"]}
          tickFormatter={formatCompact}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatLongDate(String(value))}
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-6">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">
                    {formatNumber(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar
          dataKey="messages"
          fill="var(--color-messages)"
          radius={[2, 2, 0, 0]}
          maxBarSize={20}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
