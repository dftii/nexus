import type { PrismaClient } from "@/generated/prisma/client";
import { addUtcDays, startOfUtcDay } from "@/lib/utc-day";

/**
 * Raw-event retention (Phase 4). Deletes `message_events` older than the
 * retention window, but ONLY days whose aggregate is proven to be complete, so
 * the all-time total (aggregates <= W + raw > W) never changes.
 *
 * Deletable = occurred_at < min(retention cutoff, W + 1 day). With no watermark
 * nothing is deleted; today is never deleted. Verification and deletion run in
 * one transaction under the same advisory lock as the aggregation, so the two
 * can never interleave. Deletes are bounded batches, capped per run, and the
 * next run continues where this one stopped.
 */

export const DEFAULT_DELETE_BATCH_SIZE = 5_000;
export const DEFAULT_MAX_DELETE_BATCHES = 20;
const TRANSACTION_TIMEOUT_MS = 120_000;

export type RetentionResult =
  | { status: "purged"; deleted: number }
  | {
      status: "skipped";
      reason: "not_finalized" | "aggregate_mismatch" | "missing_community";
      /** Deletable raw days that failed verification (counts only, never ids). */
      mismatchedDays?: number;
      /** Of those, how many have no aggregate row at all. */
      missingAggregates?: number;
    };

export interface RetentionService {
  /** Purge one community. Call only after a successful aggregation. */
  purgeCommunity(communityId: string, now: Date): Promise<RetentionResult>;
}

export function createRetentionService(deps: {
  prisma: PrismaClient;
  retentionDays: number;
  batchSize?: number;
  maxBatches?: number;
}): RetentionService {
  const { prisma, retentionDays } = deps;
  const batchSize = deps.batchSize ?? DEFAULT_DELETE_BATCH_SIZE;
  const maxBatches = deps.maxBatches ?? DEFAULT_MAX_DELETE_BATCHES;

  return {
    purgeCommunity: (communityId, now) =>
      prisma.$transaction(
        async (tx): Promise<RetentionResult> => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('nexus:analytics:' || ${communityId}))`;

          const community = await tx.community.findUnique({
            where: { id: communityId },
            select: { analyticsFinalizedThrough: true },
          });
          if (!community)
            return { status: "skipped", reason: "missing_community" };
          const w = community.analyticsFinalizedThrough;
          if (!w) return { status: "skipped", reason: "not_finalized" };

          const cutoff = addUtcDays(startOfUtcDay(now), -retentionDays);
          const afterWatermark = addUtcDays(w, 1);
          const limit = (
            cutoff < afterWatermark ? cutoff : afterWatermark
          ).toISOString();

          // Every deletable raw day needs its aggregate: the community row must
          // exist, hold at least the raw count (a purge cut short by the batch
          // cap leaves fewer raw rows than the aggregate, which is fine; MORE
          // raw rows means the aggregate is stale), and its channel rows must
          // add up to it exactly. Anything else keeps the raw data.
          const bad = await tx.$queryRaw<Array<{ aggregated: boolean }>>`
            SELECT (c.day IS NOT NULL) AS aggregated
            FROM (
              SELECT occurred_at::date AS day, COUNT(*)::int AS n
              FROM message_events
              WHERE community_id = ${communityId} AND occurred_at < ${limit}::timestamp
              GROUP BY 1
            ) r
            LEFT JOIN community_daily_activity c
              ON c.community_id = ${communityId} AND c.day = r.day
            WHERE c.day IS NULL
               OR r.n > c.message_count
               OR (
                 SELECT COALESCE(SUM(ch.message_count), 0)
                 FROM channel_daily_activity ch
                 WHERE ch.community_id = ${communityId} AND ch.day = r.day
               ) <> c.message_count`;
          if (bad.length > 0) {
            return {
              status: "skipped",
              reason: "aggregate_mismatch",
              mismatchedDays: bad.length,
              missingAggregates: bad.filter((row) => !row.aggregated).length,
            };
          }

          let deleted = 0;
          for (let i = 0; i < maxBatches; i++) {
            const count = await tx.$executeRaw`
              DELETE FROM message_events
              WHERE id IN (
                SELECT id FROM message_events
                WHERE community_id = ${communityId} AND occurred_at < ${limit}::timestamp
                LIMIT ${batchSize}
              )`;
            deleted += count;
            if (count < batchSize) break;
          }
          return { status: "purged", deleted };
        },
        { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_TIMEOUT_MS },
      ),
  };
}
