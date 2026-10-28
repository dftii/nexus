import type { PrismaClient } from "@/generated/prisma/client";
import { addUtcDays, startOfUtcDay, utcDayKey } from "@/lib/utc-day";

/**
 * Daily aggregation (Phase 4). Turns raw `message_events` into
 * `community_daily_activity` / `channel_daily_activity` rows and advances the
 * community watermark W (`analytics_finalized_through`).
 *
 * The web reads days <= W only from the aggregates and days > W only from raw
 * events, so this job is the single place that moves that boundary. All work is
 * PostgreSQL GROUP BY inside ONE transaction guarded by an advisory lock keyed
 * on the community (serialises concurrent runs, also across processes).
 * Upserts make a retry or a re-run idempotent; a failed transaction changes
 * nothing. Only days that HAVE raw events produce rows; rows are never deleted.
 * Dates travel as ISO strings cast in SQL: `message_events.occurred_at` is a
 * `timestamp` holding UTC, so the cast ignores the trailing `Z` on purpose.
 */

/** Late-persisted events are looked up with this safety margin (in-flight inserts). */
export const LATE_EVENT_MARGIN_MS = 10 * 60 * 1000;
const TRANSACTION_TIMEOUT_MS = 120_000;

export type AggregationResult =
  | {
      status: "aggregated";
      /** UTC days recomputed in this run. */
      days: number;
      /** New watermark W as `YYYY-MM-DD`. */
      finalizedThrough: string;
    }
  | { status: "missing_community" };

export interface AggregationService {
  /** Aggregate every pending day of one community. Throws on database errors. */
  aggregateCommunity(
    communityId: string,
    now: Date,
  ): Promise<AggregationResult>;
}

export function createAggregationService(deps: {
  prisma: PrismaClient;
  retentionDays: number;
}): AggregationService {
  const { prisma, retentionDays } = deps;

  return {
    aggregateCommunity: (communityId, now) =>
      prisma.$transaction(
        async (tx): Promise<AggregationResult> => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('nexus:analytics:' || ${communityId}))`;

          // Read W only after the lock: a concurrent run may just have moved it.
          const community = await tx.community.findUnique({
            where: { id: communityId },
            select: {
              analyticsFinalizedThrough: true,
              analyticsAggregatedAt: true,
            },
          });
          if (!community) return { status: "missing_community" };

          const today = startOfUtcDay(now);
          const yesterday = addUtcDays(today, -1);
          const retentionCutoff = addUtcDays(today, -retentionDays);
          const w = community.analyticsFinalizedThrough;

          // (a) catch-up: everything after W (all history when W is null).
          const rangeFrom = w ? addUtcDays(w, 1).toISOString() : "-infinity";
          // (b) days <= W that received events after the previous run. Never
          // older than the retention cutoff: such days may be partly purged and
          // recomputing them could overwrite a valid aggregate with a partial one.
          const lateSince = community.analyticsAggregatedAt
            ? new Date(
                community.analyticsAggregatedAt.getTime() -
                  LATE_EVENT_MARGIN_MS,
              ).toISOString()
            : "infinity";
          const todayIso = today.toISOString();
          const cutoffIso = retentionCutoff.toISOString();

          const rows = await tx.$queryRaw<Array<{ day: string }>>`
            SELECT DISTINCT (occurred_at::date)::text AS day
            FROM message_events
            WHERE community_id = ${communityId}
              AND occurred_at < ${todayIso}::timestamp
              AND (
                occurred_at >= ${rangeFrom}::timestamp
                OR (
                  created_at > ${lateSince}::timestamp
                  AND occurred_at >= ${cutoffIso}::timestamp
                  AND occurred_at < ${rangeFrom}::timestamp
                )
              )`;
          const days = rows.map((row) => row.day);

          if (days.length > 0) {
            const daysJson = JSON.stringify(days);
            const at = now.toISOString();
            // One statement = one snapshot, so the channel rows and the
            // community rows of a day always agree.
            await tx.$executeRaw`
              WITH picked AS (
                SELECT (jsonb_array_elements_text(${daysJson}::jsonb))::date AS day
              ), channel_rows AS (
                INSERT INTO channel_daily_activity
                  (community_id, day, discord_channel_id, message_count, author_count, aggregated_at)
                SELECT m.community_id, m.occurred_at::date, m.discord_channel_id,
                       COUNT(*)::int, COUNT(DISTINCT m.author_discord_id)::int, ${at}::timestamp
                FROM message_events m
                WHERE m.community_id = ${communityId}
                  AND m.occurred_at::date IN (SELECT day FROM picked)
                GROUP BY m.community_id, m.occurred_at::date, m.discord_channel_id
                ON CONFLICT (community_id, day, discord_channel_id) DO UPDATE
                  SET message_count = EXCLUDED.message_count,
                      author_count = EXCLUDED.author_count,
                      aggregated_at = EXCLUDED.aggregated_at
                RETURNING 1
              )
              INSERT INTO community_daily_activity
                (community_id, day, message_count, author_count, aggregated_at)
              SELECT m.community_id, m.occurred_at::date,
                     COUNT(*)::int, COUNT(DISTINCT m.author_discord_id)::int, ${at}::timestamp
              FROM message_events m
              WHERE m.community_id = ${communityId}
                AND m.occurred_at::date IN (SELECT day FROM picked)
              GROUP BY m.community_id, m.occurred_at::date
              ON CONFLICT (community_id, day) DO UPDATE
                SET message_count = EXCLUDED.message_count,
                    author_count = EXCLUDED.author_count,
                    aggregated_at = EXCLUDED.aggregated_at`;
          }

          // Today is never finalized; W only moves forward.
          const newW = w && w > yesterday ? w : yesterday;
          await tx.community.update({
            where: { id: communityId },
            data: {
              analyticsFinalizedThrough: newW,
              analyticsAggregatedAt: now,
            },
          });
          return {
            status: "aggregated",
            days: days.length,
            finalizedThrough: utcDayKey(newW),
          };
        },
        { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_TIMEOUT_MS },
      ),
  };
}
