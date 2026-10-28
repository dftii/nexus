import type { AggregationService } from "./aggregation";
import { describeError, type Logger } from "./logger";
import type { RetentionService } from "./retention";

export const ANALYTICS_INTERVAL_MS = 15 * 60 * 1000;
const STOP_TIMEOUT_MS = 10_000;

export interface RunSummary {
  communities: number;
  failed: number;
  daysAggregated: number;
  rowsDeleted: number;
  durationMs: number;
}

export interface AnalyticsMaintenance {
  /** Catch-up run now, then one every interval. Idempotent. */
  start(): void;
  /** Stop the timer and wait (bounded) for the run in flight. */
  stop(timeoutMs?: number): Promise<void>;
  /** One full pass. `null` when skipped (a run is in flight, or stopped). */
  runOnce(): Promise<RunSummary | null>;
}

/**
 * Scheduler for the analytics jobs. Only the bot process runs it. Per
 * community: aggregate, then (only if that succeeded) apply retention. One
 * community failing is logged and never stops the others. Single-flight: an
 * overlapping tick is skipped, so a slow run can not pile up.
 */
export function createAnalyticsMaintenance(deps: {
  aggregation: AggregationService;
  retention: RetentionService;
  /** Communities the bot knows (allowlisted, existing in NEXUS). */
  communityIds: () => string[];
  logger: Logger;
  now?: () => Date;
  intervalMs?: number;
  /** Runs before each pass (channel metadata refresh); failures only log. */
  beforeRun?: () => Promise<unknown>;
}): AnalyticsMaintenance {
  const { aggregation, retention, logger } = deps;
  const now = deps.now ?? (() => new Date());
  const intervalMs = deps.intervalMs ?? ANALYTICS_INTERVAL_MS;
  let timer: ReturnType<typeof setInterval> | undefined;
  let inFlight: Promise<RunSummary | null> | null = null;
  let stopped = false;

  const run = async (): Promise<RunSummary> => {
    const startedAt = now().getTime();
    const ids = deps.communityIds();
    logger.info("analytics_run_started", { communities: ids.length });
    try {
      await deps.beforeRun?.();
    } catch (error) {
      logger.warn("analytics_before_run_failed", describeError(error));
    }

    const summary: RunSummary = {
      communities: ids.length,
      failed: 0,
      daysAggregated: 0,
      rowsDeleted: 0,
      durationMs: 0,
    };
    for (const communityId of ids) {
      if (stopped) break;
      const at = now();
      try {
        const result = await aggregation.aggregateCommunity(communityId, at);
        if (result.status === "missing_community") continue;
        summary.daysAggregated += result.days;
      } catch (error) {
        summary.failed += 1;
        // Aggregation failed: retention must not run for this community.
        logger.error("analytics_community_failed", {
          communityId,
          stage: "aggregation",
          ...describeError(error),
        });
        continue;
      }
      try {
        const purge = await retention.purgeCommunity(communityId, at);
        if (purge.status === "purged") {
          summary.rowsDeleted += purge.deleted;
          if (purge.deleted > 0) {
            logger.info("retention_purged", {
              communityId,
              deleted: purge.deleted,
            });
          }
        } else if (purge.reason === "aggregate_mismatch") {
          logger.warn("retention_skipped", {
            communityId,
            reason: purge.reason,
            mismatchedDays: purge.mismatchedDays,
            missingAggregates: purge.missingAggregates,
          });
        }
      } catch (error) {
        summary.failed += 1;
        logger.error("analytics_community_failed", {
          communityId,
          stage: "retention",
          ...describeError(error),
        });
      }
    }
    summary.durationMs = now().getTime() - startedAt;
    logger.info("analytics_run_finished", { ...summary });
    return summary;
  };

  const runOnce = (): Promise<RunSummary | null> => {
    if (stopped || inFlight) return Promise.resolve(null);
    const current = run()
      .catch((error: unknown) => {
        logger.error("analytics_run_failed", describeError(error));
        return null;
      })
      .finally(() => {
        if (inFlight === current) inFlight = null;
      });
    inFlight = current;
    return current;
  };

  return {
    runOnce,
    start() {
      if (timer || stopped) return;
      void runOnce();
      timer = setInterval(() => void runOnce(), intervalMs);
      timer.unref?.();
    },
    async stop(timeoutMs = STOP_TIMEOUT_MS) {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = undefined;
      const pending = inFlight;
      if (!pending) return;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const expired = new Promise<void>((resolve) => {
        timeout = setTimeout(() => {
          logger.warn("analytics_stop_timeout", { timeoutMs });
          resolve();
        }, timeoutMs);
      });
      await Promise.race([pending.then(() => undefined), expired]);
      clearTimeout(timeout);
    },
  };
}
