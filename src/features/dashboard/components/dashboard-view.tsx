import type { DashboardData } from "../types";
import { ActivityFeed } from "./activity-feed";
import { DemoBanner } from "./demo-banner";
import { GrowthCard } from "./growth-card";
import { MessagesCard } from "./messages-card";
import { SummaryStats } from "./summary-stats";

/** Overview dashboard layout. Pure presentation of a `DashboardData`. */
export function DashboardView({ data }: { data: DashboardData }) {
  const isDemo = data.source === "demo";
  return (
    <div className="space-y-6">
      {isDemo ? <DemoBanner /> : null}
      <SummaryStats
        summary={data.summary}
        periodDays={data.periodDays}
        isDemo={isDemo}
      />
      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <GrowthCard data={data.membership} isDemo={isDemo} />
          <MessagesCard data={data.messageActivity} isDemo={isDemo} />
        </div>
        <ActivityFeed
          events={data.recentActivity}
          description={isDemo ? "Synthetic events (demo)" : undefined}
        />
      </div>
    </div>
  );
}
