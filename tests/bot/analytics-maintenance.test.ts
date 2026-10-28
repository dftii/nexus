import { afterEach, describe, expect, it, vi } from "vitest";
import type { AggregationService } from "@/bot/services/aggregation";
import { createAnalyticsMaintenance } from "@/bot/services/analytics-maintenance";
import type { Logger } from "@/bot/services/logger";
import type { RetentionService } from "@/bot/services/retention";

const NOW = new Date("2026-10-29T10:00:00.000Z");

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

const aggregated = (days = 2) => ({
  status: "aggregated" as const,
  days,
  finalizedThrough: "2026-10-28",
});

function setup(ids = ["a", "b", "c"]) {
  const events: Array<{ event: string; fields?: Record<string, unknown> }> = [];
  const log = (event: string, fields?: Record<string, unknown>) => {
    events.push({ event, fields });
  };
  const logger: Logger = {
    debug: () => undefined,
    info: log,
    warn: log,
    error: log,
  };
  const aggregation = {
    aggregateCommunity: vi.fn<AggregationService["aggregateCommunity"]>(
      async () => aggregated(),
    ),
  };
  const retention = {
    purgeCommunity: vi.fn<RetentionService["purgeCommunity"]>(async () => ({
      status: "purged" as const,
      deleted: 5,
    })),
  };
  const maintenance = createAnalyticsMaintenance({
    aggregation,
    retention,
    communityIds: () => ids,
    logger,
    now: () => NOW,
    intervalMs: 1000,
  });
  return { aggregation, retention, maintenance, events, logger };
}

afterEach(() => vi.useRealTimers());

describe("createAnalyticsMaintenance", () => {
  it("aggregates then purges every community and logs a summary", async () => {
    const { maintenance, aggregation, retention, events } = setup();
    const summary = await maintenance.runOnce();
    expect(summary).toMatchObject({
      communities: 3,
      failed: 0,
      daysAggregated: 6,
      rowsDeleted: 15,
    });
    expect(aggregation.aggregateCommunity).toHaveBeenCalledWith("a", NOW);
    expect(retention.purgeCommunity).toHaveBeenCalledTimes(3);
    const names = events.map((e) => e.event);
    expect(names).toContain("analytics_run_started");
    expect(names).toContain("analytics_run_finished");
  });

  it("isolates a failing community and skips its retention", async () => {
    const { maintenance, aggregation, retention, events } = setup();
    aggregation.aggregateCommunity.mockRejectedValueOnce(new Error("boom"));
    const summary = await maintenance.runOnce();
    expect(summary).toMatchObject({
      communities: 3,
      failed: 1,
      rowsDeleted: 10,
    });
    expect(retention.purgeCommunity).toHaveBeenCalledTimes(2);
    expect(retention.purgeCommunity).not.toHaveBeenCalledWith("a", NOW);
    expect(events.some((e) => e.event === "analytics_community_failed")).toBe(
      true,
    );
  });

  it("isolates a retention failure too", async () => {
    const { maintenance, retention } = setup();
    retention.purgeCommunity.mockRejectedValueOnce(new Error("boom"));
    const summary = await maintenance.runOnce();
    expect(summary).toMatchObject({ failed: 1, daysAggregated: 6 });
  });

  it("logs retention_skipped with counts only", async () => {
    const { maintenance, retention, events } = setup(["a"]);
    retention.purgeCommunity.mockResolvedValueOnce({
      status: "skipped",
      reason: "aggregate_mismatch",
      mismatchedDays: 2,
      missingAggregates: 1,
    });
    await maintenance.runOnce();
    expect(events.find((e) => e.event === "retention_skipped")?.fields).toEqual(
      {
        communityId: "a",
        reason: "aggregate_mismatch",
        mismatchedDays: 2,
        missingAggregates: 1,
      },
    );
  });

  it("is single-flight: an overlapping run is skipped", async () => {
    const { maintenance, aggregation } = setup(["a"]);
    const gate = deferred();
    aggregation.aggregateCommunity.mockImplementationOnce(async () => {
      await gate.promise;
      return aggregated(0);
    });
    const first = maintenance.runOnce();
    expect(await maintenance.runOnce()).toBeNull();
    gate.resolve();
    expect(await first).not.toBeNull();
    expect(aggregation.aggregateCommunity).toHaveBeenCalledTimes(1);
    expect(await maintenance.runOnce()).not.toBeNull();
  });

  it("start runs a catch-up at once, then on every interval, until stop", async () => {
    vi.useFakeTimers();
    const { maintenance, aggregation } = setup(["a"]);
    maintenance.start();
    maintenance.start(); // idempotent
    await vi.advanceTimersByTimeAsync(0);
    expect(aggregation.aggregateCommunity).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(aggregation.aggregateCommunity).toHaveBeenCalledTimes(2);
    await maintenance.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(aggregation.aggregateCommunity).toHaveBeenCalledTimes(2);
  });

  it("stop waits for the run in flight and starts no further community", async () => {
    const { maintenance, aggregation } = setup(["a", "b"]);
    const gate = deferred();
    aggregation.aggregateCommunity.mockImplementationOnce(async () => {
      await gate.promise;
      return aggregated(0);
    });
    const run = maintenance.runOnce();
    await vi.waitFor(() =>
      expect(aggregation.aggregateCommunity).toHaveBeenCalledTimes(1),
    );
    let stopped = false;
    const stopping = maintenance.stop().then(() => (stopped = true));
    await Promise.resolve();
    expect(stopped).toBe(false);
    gate.resolve();
    await stopping;
    await run;
    expect(aggregation.aggregateCommunity).toHaveBeenCalledTimes(1);
    expect(await maintenance.runOnce()).toBeNull();
  });

  it("stop gives up after the timeout", async () => {
    vi.useFakeTimers();
    const { maintenance, aggregation } = setup(["a"]);
    aggregation.aggregateCommunity.mockImplementationOnce(
      () => new Promise(() => undefined),
    );
    void maintenance.runOnce();
    const stopping = maintenance.stop(500);
    await vi.advanceTimersByTimeAsync(500);
    await expect(stopping).resolves.toBeUndefined();
  });

  it("a failing beforeRun hook does not block the run", async () => {
    const { aggregation, retention, logger } = setup();
    const maintenance = createAnalyticsMaintenance({
      aggregation,
      retention,
      communityIds: () => ["a"],
      logger,
      beforeRun: async () => {
        throw new Error("sync down");
      },
    });
    expect(await maintenance.runOnce()).toMatchObject({ failed: 0 });
    expect(aggregation.aggregateCommunity).toHaveBeenCalledTimes(1);
  });
});
