import "server-only";

import { loadActivity, type ActivityResult } from "./context";
import {
  getCommunityActivitySummary,
  getRecentActivity,
  type CommunityActivitySummary,
  type RecentActivityItem,
} from "./queries";

export type { OverviewBot } from "./context";

export type OverviewData = ActivityResult<{
  summary: CommunityActivitySummary;
  recent: RecentActivityItem[];
}>;

/**
 * Everything the Overview needs for `userId`, from the same authoritative
 * queries as Analytics. Null when the user has no community.
 */
export function getOverviewData(
  userId: string,
  now: Date = new Date(),
): Promise<OverviewData | null> {
  return loadActivity(userId, now, async ({ community, finalizedThrough }) => {
    const [summary, recent] = await Promise.all([
      getCommunityActivitySummary(community.id, finalizedThrough, now),
      getRecentActivity(community.id),
    ]);
    return { summary, recent };
  });
}
