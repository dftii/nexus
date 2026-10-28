import "server-only";

import { addUtcDays, startOfUtcDay, utcDayKey } from "@/lib/utc-day";
import { getDb } from "@/server/db";
import {
  buildHeatmap,
  type ChannelRow,
  type DailyPoint,
  type DayRow,
  type Heatmap,
  mergeChannels,
  mergeDaily,
  RAW_GUARANTEED_DAYS,
  rangeStart,
  rawStart,
} from "./pure";

/**
 * THE read side of the message statistics, shared by Overview and Analytics.
 * Every function takes ONE community id (from `getActiveCommunity`, never from
 * the browser) and `w`, that community's `analyticsFinalizedThrough`: days <= w
 * are read ONLY from the aggregate tables, days > w ONLY from raw events, so a
 * day is never counted twice. Only metadata exists, never message text.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Lower bound that matches every aggregate day (avoids NULL parameters). */
const MIN_DAY = "0001-01-01";

export interface CommunityActivitySummary {
  /** Recorded messages, all time (aggregates up to W + raw after W). */
  totalEvents: number;
  /** Raw events with occurred_at > now - 24 h. */
  last24h: number;
  /** Messages on today and the 6 previous UTC days. */
  last7d: number;
  /** Distinct authors on those same 7 UTC days (exact, from raw events). */
  activeAuthors7d: number;
  /** Earliest / latest raw event still stored. */
  firstEventAt: Date | null;
  lastEventAt: Date | null;
}

export interface RecentActivityItem {
  id: string;
  occurredAt: Date;
  channelId: string;
  /** Null when the bot has not stored the channel's name. */
  channelName: string | null;
  authorId: string;
}

export const RECENT_ACTIVITY_DEFAULT_LIMIT = 10;
const RECENT_ACTIVITY_MAX_LIMIT = 50;

/** Messages on UTC days >= `from` (null = all time), hybrid per the rule. */
async function countMessages(
  communityId: string,
  w: Date | null,
  from: Date | null,
): Promise<number> {
  const wKey = w ? utcDayKey(w) : MIN_DAY;
  const fromKey = from ? utcDayKey(from) : MIN_DAY;
  const since = rawStart(w, from);
  const rows = await getDb().$queryRaw<Array<{ total: number }>>`
    SELECT (
      (SELECT COALESCE(SUM(message_count), 0) FROM community_daily_activity
        WHERE community_id = ${communityId}
          AND day >= ${fromKey}::date AND day <= ${wKey}::date)
      + (SELECT COUNT(*) FROM message_events
        WHERE community_id = ${communityId} AND occurred_at >= ${since})
    )::int AS total`;
  return Number(rows[0]?.total ?? 0);
}

/** Channel display names for these ids, scoped to the community. */
async function getChannelNames(
  communityId: string,
  channelIds: readonly string[],
): Promise<Map<string, string>> {
  if (channelIds.length === 0) return new Map();
  const rows = await getDb().discordChannel.findMany({
    where: { communityId, discordChannelId: { in: [...channelIds] } },
    select: { discordChannelId: true, name: true },
  });
  return new Map(rows.map((r) => [r.discordChannelId, r.name]));
}

/** KPIs for one community: 4 queries in parallel, all index-bounded. */
export async function getCommunityActivitySummary(
  communityId: string,
  w: Date | null,
  now: Date = new Date(),
): Promise<CommunityActivitySummary> {
  const db = getDb();
  const start7 = addUtcDays(startOfUtcDay(now), -6);
  const since24h = new Date(now.getTime() - DAY_MS);

  const [totalEvents, last7d, recent, bounds] = await Promise.all([
    countMessages(communityId, w, null),
    countMessages(communityId, w, start7),
    db.$queryRaw<Array<{ last24h: number; authors: number }>>`
      SELECT COUNT(*) FILTER (WHERE occurred_at > ${since24h})::int AS "last24h",
             COUNT(DISTINCT author_discord_id)::int AS authors
      FROM message_events
      WHERE community_id = ${communityId} AND occurred_at >= ${start7}`,
    db.messageEvent.aggregate({
      where: { communityId },
      _min: { occurredAt: true },
      _max: { occurredAt: true },
    }),
  ]);

  return {
    totalEvents,
    last24h: Number(recent[0]?.last24h ?? 0),
    last7d,
    activeAuthors7d: Number(recent[0]?.authors ?? 0),
    firstEventAt: bounds._min.occurredAt,
    lastEventAt: bounds._max.occurredAt,
  };
}

/** Messages and distinct authors per UTC day for the last `days` days (zero-filled). */
export async function getDailySeries(
  communityId: string,
  w: Date | null,
  days: number,
  now: Date = new Date(),
): Promise<DailyPoint[]> {
  const db = getDb();
  const to = startOfUtcDay(now);
  const from = rangeStart(now, days);
  const [aggregate, raw] = await Promise.all([
    w && from <= w
      ? db.communityDailyActivity.findMany({
          where: { communityId, day: { gte: from, lte: w } },
          select: { day: true, messageCount: true, authorCount: true },
        })
      : [],
    db.$queryRaw<DayRow[]>`
      SELECT to_char(occurred_at, 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS messages,
             COUNT(DISTINCT author_discord_id)::int AS authors
      FROM message_events
      WHERE community_id = ${communityId} AND occurred_at >= ${rawStart(w, from)}
      GROUP BY 1`,
  ]);
  return mergeDaily(
    from,
    to,
    w,
    aggregate.map((r) => ({
      day: utcDayKey(r.day),
      messages: r.messageCount,
      authors: r.authorCount,
    })),
    raw,
  );
}

/**
 * Messages per channel over the last `days` days, biggest first, with the
 * share of the total. Counts follow the same hybrid rule as the daily series,
 * so they sum to the community total. Distinct authors per channel are exact
 * (raw events) only for ranges inside the guaranteed raw window; otherwise null.
 */
export async function getChannelBreakdown(
  communityId: string,
  w: Date | null,
  days: number,
  now: Date = new Date(),
): Promise<ChannelRow[]> {
  const db = getDb();
  const from = rangeStart(now, days);
  const since = rawStart(w, from);
  const [aggregate, raw, authors] = await Promise.all([
    w && from <= w
      ? db.channelDailyActivity.groupBy({
          by: ["discordChannelId"],
          where: { communityId, day: { gte: from, lte: w } },
          _sum: { messageCount: true },
        })
      : [],
    db.$queryRaw<Array<{ channelId: string; messages: number }>>`
      SELECT discord_channel_id AS "channelId", COUNT(*)::int AS messages
      FROM message_events
      WHERE community_id = ${communityId} AND occurred_at >= ${since}
      GROUP BY 1`,
    days <= RAW_GUARANTEED_DAYS
      ? db.$queryRaw<Array<{ channelId: string; authors: number }>>`
          SELECT discord_channel_id AS "channelId",
                 COUNT(DISTINCT author_discord_id)::int AS authors
          FROM message_events
          WHERE community_id = ${communityId} AND occurred_at >= ${from}
          GROUP BY 1`
      : null,
  ]);

  const counts = aggregate.map((r) => ({
    channelId: r.discordChannelId,
    messages: r._sum.messageCount ?? 0,
  }));
  const names = await getChannelNames(communityId, [
    ...new Set([...counts, ...raw].map((c) => c.channelId)),
  ]);
  return mergeChannels(
    counts,
    raw,
    authors && new Map(authors.map((a) => [a.channelId, Number(a.authors)])),
    names,
  );
}

/** Raw messages by weekday x hour (UTC) over the last min(days, 30) days. */
export async function getHourlyHeatmap(
  communityId: string,
  days: number,
  now: Date = new Date(),
): Promise<Heatmap> {
  const from = rangeStart(now, Math.min(days, RAW_GUARANTEED_DAYS));
  const rows = await getDb().$queryRaw<
    Array<{ dow: number; hour: number; count: number }>
  >`
    SELECT EXTRACT(DOW FROM occurred_at)::int AS dow,
           EXTRACT(HOUR FROM occurred_at)::int AS hour,
           COUNT(*)::int AS count
    FROM message_events
    WHERE community_id = ${communityId} AND occurred_at >= ${from}
    GROUP BY 1, 2`;
  return buildHeatmap(rows);
}

/** First UTC day that has an aggregate row, or null. */
export async function getEarliestAggregateDay(
  communityId: string,
): Promise<Date | null> {
  const r = await getDb().communityDailyActivity.aggregate({
    where: { communityId },
    _min: { day: true },
  });
  return r._min.day;
}

/** The newest events of one community, newest first (ids and channel name, no content). */
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
  const names = await getChannelNames(communityId, [
    ...new Set(rows.map((r) => r.discordChannelId)),
  ]);
  return rows.map((row) => ({
    id: row.id,
    occurredAt: row.occurredAt,
    channelId: row.discordChannelId,
    channelName: names.get(row.discordChannelId) ?? null,
    authorId: row.authorDiscordId,
  }));
}
