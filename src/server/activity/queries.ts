import "server-only";

import { getDb } from "@/server/db";

/**
 * Read side of the message events the bot stores. Every query is scoped to ONE
 * community id that the caller got from `getActiveCommunity` (a membership
 * checked id), never from the browser. Only metadata exists in the table, so
 * only metadata can be returned: no message text is ever stored or read.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CommunityActivitySummary {
  /** Messages recorded since collection started. */
  totalEvents: number;
  last24h: number;
  last7d: number;
  /** Distinct authors with at least one message in the last 7 days. */
  activeAuthors7d: number;
  firstEventAt: Date | null;
  lastEventAt: Date | null;
}

export interface RecentActivityItem {
  id: string;
  occurredAt: Date;
  channelId: string;
  authorId: string;
}

export const RECENT_ACTIVITY_DEFAULT_LIMIT = 10;
const RECENT_ACTIVITY_MAX_LIMIT = 50;

/**
 * Counts and bounds for one community. All reads hit the
 * `(community_id, occurred_at)` index: three counts, one min/max aggregate and
 * one `COUNT(DISTINCT)` for authors over the 7-day window (a single scalar, so
 * the author ids never travel to the app).
 */
export async function getCommunityActivitySummary(
  communityId: string,
  now: Date = new Date(),
): Promise<CommunityActivitySummary> {
  const db = getDb();
  const since24h = new Date(now.getTime() - DAY_MS);
  const since7d = new Date(now.getTime() - 7 * DAY_MS);

  const [totalEvents, last24h, last7d, bounds, authors] = await Promise.all([
    db.messageEvent.count({ where: { communityId } }),
    db.messageEvent.count({
      where: { communityId, occurredAt: { gte: since24h } },
    }),
    db.messageEvent.count({
      where: { communityId, occurredAt: { gte: since7d } },
    }),
    db.messageEvent.aggregate({
      where: { communityId },
      _min: { occurredAt: true },
      _max: { occurredAt: true },
    }),
    db.$queryRaw<Array<{ authors: number }>>`
      SELECT COUNT(DISTINCT author_discord_id)::int AS authors
      FROM message_events
      WHERE community_id = ${communityId} AND occurred_at >= ${since7d}`,
  ]);

  return {
    totalEvents,
    last24h,
    last7d,
    activeAuthors7d: Number(authors[0]?.authors ?? 0),
    firstEventAt: bounds._min.occurredAt,
    lastEventAt: bounds._max.occurredAt,
  };
}

/** The newest events of one community, newest first (ids only, no content). */
export async function getRecentActivity(
  communityId: string,
  limit: number = RECENT_ACTIVITY_DEFAULT_LIMIT,
): Promise<RecentActivityItem[]> {
  const take = Math.min(
    Math.max(Math.trunc(limit) || RECENT_ACTIVITY_DEFAULT_LIMIT, 1),
    RECENT_ACTIVITY_MAX_LIMIT,
  );
  const rows = await getDb().messageEvent.findMany({
    where: { communityId },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      occurredAt: true,
      discordChannelId: true,
      authorDiscordId: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    occurredAt: row.occurredAt,
    channelId: row.discordChannelId,
    authorId: row.authorDiscordId,
  }));
}
