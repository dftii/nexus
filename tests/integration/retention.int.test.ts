import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { createAggregationService } from "@/bot/services/aggregation";
import { createAnalyticsMaintenance } from "@/bot/services/analytics-maintenance";
import { silentLogger } from "@/bot/services/logger";
import { createRetentionService } from "@/bot/services/retention";
import {
  createTestPrisma,
  hasTestDatabase,
  resetTestDatabase,
} from "../helpers/test-db";
import {
  allTimeMessages,
  communityRows,
  createCommunity,
  eventsOn,
  failingOnce,
  rawCount,
  seedEvents,
} from "./aggregation-helpers";

// today = 10-29, retention 30 days -> cutoff 2026-09-29 00:00Z
const NOW = new Date("2026-10-29T10:00:00.000Z");

describe.skipIf(!hasTestDatabase)("raw event retention (PostgreSQL)", () => {
  let db: PrismaClient;
  let aggregation: ReturnType<typeof createAggregationService>;
  let retention: ReturnType<typeof createRetentionService>;

  beforeEach(async () => {
    db ??= createTestPrisma();
    aggregation = createAggregationService({ prisma: db, retentionDays: 30 });
    retention = createRetentionService({ prisma: db, retentionDays: 30 });
    await resetTestDatabase(db);
  });
  afterAll(async () => {
    await db?.$disconnect();
  });

  const seedHistory = async (communityId: string) =>
    seedEvents(db, communityId, [
      ...eventsOn("2026-09-20", 3),
      ...eventsOn("2026-09-28", 2, { channel: "ch2" }),
      ...eventsOn("2026-09-29", 4), // cutoff day: kept
      ...eventsOn("2026-10-28", 2),
      ...eventsOn("2026-10-29", 5), // today: kept
    ]);

  it("deletes only days before the cutoff, keeps the cutoff day and today, and keeps the all-time total", async () => {
    const c = await createCommunity(db);
    await seedHistory(c.id);
    const total = await allTimeMessages(db, c.id);
    expect(total).toBe(16);

    await aggregation.aggregateCommunity(c.id, NOW);
    expect(await allTimeMessages(db, c.id)).toBe(total);
    const aggregatesBefore = await communityRows(db, c.id);

    expect(await retention.purgeCommunity(c.id, NOW)).toEqual({
      status: "purged",
      deleted: 5,
    });
    expect(await rawCount(db, c.id)).toBe(11);
    expect(await allTimeMessages(db, c.id)).toBe(total); // unchanged by cleanup
    expect(await communityRows(db, c.id)).toEqual(aggregatesBefore); // aggregates kept
    const oldest = await db.messageEvent.findFirstOrThrow({
      where: { communityId: c.id },
      orderBy: { occurredAt: "asc" },
    });
    expect(oldest.occurredAt.toISOString()).toBe("2026-09-29T10:00:00.000Z");
    expect(
      await db.messageEvent.count({
        where: {
          communityId: c.id,
          occurredAt: { gte: new Date("2026-10-29T00:00:00Z") },
        },
      }),
    ).toBe(5);
  });

  it("deletes nothing before the first aggregation (no watermark)", async () => {
    const c = await createCommunity(db);
    await seedHistory(c.id);
    expect(await retention.purgeCommunity(c.id, NOW)).toEqual({
      status: "skipped",
      reason: "not_finalized",
    });
    expect(await rawCount(db, c.id)).toBe(16);
  });

  it("deletes nothing when an aggregate is missing", async () => {
    const c = await createCommunity(db);
    await seedHistory(c.id);
    await aggregation.aggregateCommunity(c.id, NOW);
    await db.communityDailyActivity.delete({
      where: {
        communityId_day: {
          communityId: c.id,
          day: new Date("2026-09-20T00:00:00Z"),
        },
      },
    });
    expect(await retention.purgeCommunity(c.id, NOW)).toMatchObject({
      status: "skipped",
      reason: "aggregate_mismatch",
      mismatchedDays: 1,
      missingAggregates: 1,
    });
    expect(await rawCount(db, c.id)).toBe(16);
  });

  it("deletes nothing when an aggregate count does not match the raw count", async () => {
    const c = await createCommunity(db);
    await seedHistory(c.id);
    await aggregation.aggregateCommunity(c.id, NOW);
    await db.communityDailyActivity.update({
      where: {
        communityId_day: {
          communityId: c.id,
          day: new Date("2026-09-28T00:00:00Z"),
        },
      },
      data: { messageCount: 1, authorCount: 1 },
    });
    expect(await retention.purgeCommunity(c.id, NOW)).toMatchObject({
      status: "skipped",
      reason: "aggregate_mismatch",
      mismatchedDays: 1,
      missingAggregates: 0,
    });
    expect(await rawCount(db, c.id)).toBe(16);
  });

  it("deletes nothing when the channel rows do not sum to the day", async () => {
    const c = await createCommunity(db);
    await seedHistory(c.id);
    await aggregation.aggregateCommunity(c.id, NOW);
    await db.channelDailyActivity.deleteMany({
      where: { communityId: c.id, discordChannelId: "ch2" },
    });
    expect(await retention.purgeCommunity(c.id, NOW)).toMatchObject({
      status: "skipped",
      reason: "aggregate_mismatch",
    });
    expect(await rawCount(db, c.id)).toBe(16);
  });

  it("never deletes past the watermark, even when older than the cutoff", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, [
      ...eventsOn("2026-09-05", 2),
      ...eventsOn("2026-09-15", 3), // after W, but older than the cutoff
    ]);
    // The bot was last up on 09-12: W = 09-11.
    await aggregation.aggregateCommunity(
      c.id,
      new Date("2026-09-12T10:00:00Z"),
    );
    expect(await retention.purgeCommunity(c.id, NOW)).toEqual({
      status: "purged",
      deleted: 2,
    });
    expect(await rawCount(db, c.id)).toBe(3);
  });

  it("deletes in bounded batches and resumes on the next run", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, eventsOn("2026-09-10", 7));
    await aggregation.aggregateCommunity(c.id, NOW);
    const small = createRetentionService({
      prisma: db,
      retentionDays: 30,
      batchSize: 2,
      maxBatches: 2,
    });
    expect(await small.purgeCommunity(c.id, NOW)).toEqual({
      status: "purged",
      deleted: 4,
    });
    expect(await rawCount(db, c.id)).toBe(3);
    // The half-purged day still verifies (fewer raw rows than its aggregate).
    expect(await small.purgeCommunity(c.id, NOW)).toEqual({
      status: "purged",
      deleted: 3,
    });
    expect(await rawCount(db, c.id)).toBe(0);
    expect(await allTimeMessages(db, c.id)).toBe(7);
  });

  it("isolates communities", async () => {
    const a = await createCommunity(db, "a");
    const b = await createCommunity(db, "b");
    await seedHistory(a.id);
    await seedHistory(b.id);
    await aggregation.aggregateCommunity(a.id, NOW);
    await retention.purgeCommunity(a.id, NOW);
    expect(await rawCount(db, a.id)).toBe(11);
    expect(await rawCount(db, b.id)).toBe(16);
    // b was never aggregated: nothing may be deleted for it.
    expect((await retention.purgeCommunity(b.id, NOW)).status).toBe("skipped");
    expect(await rawCount(db, b.id)).toBe(16);
  });

  describe("through the scheduler", () => {
    it("does not delete when the aggregation failed, and converges after a rerun", async () => {
      const c = await createCommunity(db);
      await seedHistory(c.id);
      const maintenance = createAnalyticsMaintenance({
        aggregation: createAggregationService({
          prisma: failingOnce(db),
          retentionDays: 30,
        }),
        retention,
        communityIds: () => [c.id],
        logger: silentLogger,
        now: () => NOW,
      });

      expect(await maintenance.runOnce()).toMatchObject({
        failed: 1,
        rowsDeleted: 0,
      });
      expect(await rawCount(db, c.id)).toBe(16);
      expect(await communityRows(db, c.id)).toEqual([]);

      // Next cycle: aggregation succeeds, then retention runs.
      expect(await maintenance.runOnce()).toMatchObject({
        failed: 0,
        rowsDeleted: 5,
      });
      expect(await rawCount(db, c.id)).toBe(11);
      expect(await allTimeMessages(db, c.id)).toBe(16);
    });
  });
});
