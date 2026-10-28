import "server-only";

import { getBotStatus, type BotStatus } from "@/lib/bot-status";
import { getActiveCommunity, type UserCommunity } from "@/server/communities";
import { getDb } from "@/server/db";
import {
  getCommunityActivitySummary,
  getRecentActivity,
  type CommunityActivitySummary,
  type RecentActivityItem,
} from "./queries";

export interface OverviewBot {
  status: BotStatus;
  /** Start of collection for the current installation. */
  connectedAt: Date | null;
  /** Last heartbeat that included the guild. */
  lastSeenAt: Date | null;
}

export type OverviewData =
  | {
      status: "ok";
      community: UserCommunity;
      bot: OverviewBot;
      /** Null while the bot is not installed: nothing is collected. */
      activity: {
        summary: CommunityActivitySummary;
        recent: RecentActivityItem[];
      } | null;
    }
  /** The database failed; `community` is known only if it loaded before. */
  | { status: "error"; community: UserCommunity | null };

/**
 * Everything the Overview needs for `userId`. The community comes ONLY from
 * `getActiveCommunity` (membership-validated, the cookie is a hint); the
 * activity queries are then scoped to that id. Returns null when the user has
 * no community (the page redirects to onboarding). Never throws: a database
 * failure becomes `{ status: "error" }` for the page to render.
 */
export async function getOverviewData(
  userId: string,
  now: Date = new Date(),
): Promise<OverviewData | null> {
  let community: UserCommunity | null = null;
  try {
    community = await getActiveCommunity(userId);
    if (!community) return null;

    const row = await getDb().community.findUnique({
      where: { id: community.id },
      select: { botConnectedAt: true, botLastSeenAt: true },
    });
    if (!row) return { status: "error", community };

    const status = getBotStatus(row, now);
    const bot: OverviewBot = {
      status,
      connectedAt: row.botConnectedAt,
      lastSeenAt: row.botLastSeenAt,
    };
    if (status === "not_installed") {
      return { status: "ok", community, bot, activity: null };
    }

    const [summary, recent] = await Promise.all([
      getCommunityActivitySummary(community.id, now),
      getRecentActivity(community.id),
    ]);
    return { status: "ok", community, bot, activity: { summary, recent } };
  } catch {
    // Details (connection strings, SQL) never reach the page.
    return { status: "error", community };
  }
}
