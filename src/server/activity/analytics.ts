import "server-only";

import { loadActivity, type ActivityResult } from "./context";
import {
  isAggregationStale,
  RAW_GUARANTEED_DAYS,
  type ChannelRow,
  type DailyPoint,
  type Heatmap,
  type RangeDays,
} from "./pure";
import {
  getChannelBreakdown,
  getCommunityActivitySummary,
  getDailySeries,
  getEarliestAggregateDay,
  getHourlyHeatmap,
  getRecentActivity,
  type CommunityActivitySummary,
  type RecentActivityItem,
} from "./queries";

export const ANALYTICS_RECENT_LIMIT = 25;

export interface AnalyticsCoverage {
  /** W: every day up to here is read from daily aggregates. */
  finalizedThrough: Date | null;
  aggregatedAt: Date | null;
  earliestAggregateDay: Date | null;
  earliestRawAt: Date | null;
  stale: boolean;
}

export interface AnalyticsActivity {
  range: RangeDays;
  /** Days the heatmap covers: min(range, 30). */
  heatmapDays: number;
  summary: CommunityActivitySummary;
  daily: DailyPoint[];
  channels: ChannelRow[];
  heatmap: Heatmap;
  recent: RecentActivityItem[];
  coverage: AnalyticsCoverage;
}

export type AnalyticsData = ActivityResult<AnalyticsActivity>;

/** Everything `/analytics` shows for the user's active community and `range`. */
export function getAnalyticsData(
  userId: string,
  range: RangeDays,
  now: Date = new Date(),
): Promise<AnalyticsData | null> {
  return loadActivity(
    userId,
    now,
    async ({ community, finalizedThrough, aggregatedAt }) => {
      const id = community.id;
      const [summary, daily, channels, heatmap, recent, earliestAggregateDay] =
        await Promise.all([
          getCommunityActivitySummary(id, finalizedThrough, now),
          getDailySeries(id, finalizedThrough, range, now),
          getChannelBreakdown(id, finalizedThrough, range, now),
          getHourlyHeatmap(id, range, now),
          getRecentActivity(id, ANALYTICS_RECENT_LIMIT),
          getEarliestAggregateDay(id),
        ]);
      const earliestRawAt = summary.firstEventAt;
      return {
        range,
        heatmapDays: Math.min(range, RAW_GUARANTEED_DAYS),
        summary,
        daily,
        channels,
        heatmap,
        recent,
        coverage: {
          finalizedThrough,
          aggregatedAt,
          earliestAggregateDay,
          earliestRawAt,
          stale: isAggregationStale(
            { finalizedThrough, aggregatedAt, earliestRawAt },
            now,
          ),
        },
      };
    },
  );
}
