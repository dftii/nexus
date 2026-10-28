"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatLongDate, formatNumber, formatShortDate } from "@/lib/format";
import type { MembershipPoint } from "../types";

const config = {
  members: { label: "Members", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface MembershipGrowthChartProps {
  data: readonly MembershipPoint[];
  yDomain: [number, number];
}

/** Total members per day as an area chart (keyboard navigable via recharts). */
export function MembershipGrowthChart({
  data,
  yDomain,
}: MembershipGrowthChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No membership history yet"
        description="Daily member counts will appear here once data is available."
      />
    );
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <AreaChart
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
          minTickGap={48}
          tickFormatter={formatShortDate}
        />
        <YAxis
          width={52}
          tickCount={5}
          tickLine={false}
          axisLine={false}
          domain={yDomain}
          tickFormatter={formatNumber}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatLongDate(String(label))}
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-6">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium tabular-nums">
                    {formatNumber(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          dataKey="members"
          type="monotone"
          stroke="var(--color-members)"
          strokeWidth={2}
          fill="var(--color-members)"
          fillOpacity={0.12}
          dot={false}
          isAnimationActive={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
