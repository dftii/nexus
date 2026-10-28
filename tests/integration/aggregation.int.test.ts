import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { createAggregationService } from "@/bot/services/aggregation";
import {
  createTestPrisma,
  hasTestDatabase,
  resetTestDatabase,
} from "../helpers/test-db";
import {
  allTimeMessages,
  channelRows,
  communityRows,
  createCommunity,
  eventsOn,
  failingOnce,
  rawCount,
  seedEvents,
  watermark,
} from "./aggregation-helpers";

const NOW = new Date("2026-10-29T10:00:00.000Z"); // today = 10-29, yesterday = 10-28

describe.skipIf(!hasTestDatabase)("daily aggregation (PostgreSQL)", () => {
  let db: PrismaClient;
  let aggregation: ReturnType<typeof createAggregationService>;

  beforeEach(async () => {
    db ??= createTestPrisma();
    aggregation = createAggregationService({ prisma: db, retentionDays: 30 });
    await resetTestDatabase(db);
  });
  afterAll(async () => {
    await db?.$disconnect();
  });

  it("counts messages and distinct authors per day, and per channel", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, [
      { at: "2026-10-27T10:00:00.000Z", author: "A", channel: "ch1" },
      { at: "2026-10-27T10:01:00.000Z", author: "A", channel: "ch1" },
      { at: "2026-10-27T10:02:00.000Z", author: "B", channel: "ch1" },
      { at: "2026-10-27T11:00:00.000Z", author: "A", channel: "ch2" },
      { at: "2026-10-27T11:01:00.000Z", author: "C", channel: "ch2" },
      { at: "2026-10-28T09:00:00.000Z", author: "A", channel: "ch1" },
    ]);

    const result = await aggregation.aggregateCommunity(c.id, NOW);
    expect(result).toEqual({
      status: "aggregated",
      days: 2,
      finalizedThrough: "2026-10-28",
    });

    expect(await communityRows(db, c.id)).toEqual([
      { day: "2026-10-27", messages: 5, authors: 3 },
      { day: "2026-10-28", messages: 1, authors: 1 },
    ]);
    const channels = await channelRows(db, c.id);
    expect(channels).toEqual([
      { day: "2026-10-27", channel: "ch1", messages: 3, authors: 2 },
      { day: "2026-10-27", channel: "ch2", messages: 2, authors: 2 },
      { day: "2026-10-28", channel: "ch1", messages: 1, authors: 1 },
    ]);
    // Channel sums equal the community totals for every day.
    for (const row of await communityRows(db, c.id)) {
      const sum = channels
        .filter((ch) => ch.day === row.day)
        .reduce((n, ch) => n + ch.messages, 0);
      expect(sum).toBe(row.messages);
    }
  });

  it("splits days at the UTC boundary and never aggregates today", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, [
      { at: "2026-10-26T23:59:59.999Z" },
      { at: "2026-10-27T00:00:00.000Z" },
      { at: "2026-10-27T23:59:59.999Z" },
      { at: "2026-10-28T00:00:00.000Z" },
      { at: "2026-10-29T00:00:00.000Z" }, // today
    ]);
    await aggregation.aggregateCommunity(c.id, NOW);
    expect(await communityRows(db, c.id)).toEqual([
      { day: "2026-10-26", messages: 1, authors: 1 },
      { day: "2026-10-27", messages: 2, authors: 1 },
      { day: "2026-10-28", messages: 1, authors: 1 },
    ]);
    expect((await watermark(db, c.id)).through).toBe("2026-10-28");
  });

  it("is idempotent: a re-run changes nothing", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, eventsOn("2026-10-20", 4));
    await aggregation.aggregateCommunity(c.id, NOW);
    const first = {
      community: await communityRows(db, c.id),
      channels: await channelRows(db, c.id),
    };
    const again = await aggregation.aggregateCommunity(
      c.id,
      new Date("2026-10-29T10:15:00.000Z"),
    );
    expect(again).toMatchObject({ status: "aggregated", days: 0 });
    expect({
      community: await communityRows(db, c.id),
      channels: await channelRows(db, c.id),
    }).toEqual(first);
  });

  it("backfills the whole history on the first run (W null)", async () => {
    const c = await createCommunity(db);
    expect((await watermark(db, c.id)).through).toBeNull();
    await seedEvents(db, c.id, [
      ...eventsOn("2026-08-03", 2), // older than the retention cutoff: still aggregated
      ...eventsOn("2026-10-01", 3),
      ...eventsOn("2026-10-15", 1),
    ]);
    await aggregation.aggregateCommunity(c.id, NOW);
    expect((await communityRows(db, c.id)).map((r) => r.day)).toEqual([
      "2026-08-03",
      "2026-10-01",
      "2026-10-15",
    ]);
  });

  it("catches up several days after downtime", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, eventsOn("2026-10-20", 2));
    await aggregation.aggregateCommunity(
      c.id,
      new Date("2026-10-21T10:00:00Z"),
    );
    expect((await watermark(db, c.id)).through).toBe("2026-10-20");

    // The bot was down 10-21 .. 10-24; events were stored later in bulk.
    await seedEvents(db, c.id, [
      ...eventsOn("2026-10-22", 3),
      ...eventsOn("2026-10-24", 1),
      ...eventsOn("2026-10-28", 2),
    ]);
    const result = await aggregation.aggregateCommunity(c.id, NOW);
    expect(result).toMatchObject({ days: 3, finalizedThrough: "2026-10-28" });
    expect(
      (await communityRows(db, c.id)).map((r) => [r.day, r.messages]),
    ).toEqual([
      ["2026-10-20", 2],
      ["2026-10-22", 3],
      ["2026-10-24", 1],
      ["2026-10-28", 2],
    ]);
  });

  it("re-aggregates a finalized day that received a late-persisted event", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, eventsOn("2026-10-27", 2));
    await aggregation.aggregateCommunity(c.id, NOW);
    expect((await communityRows(db, c.id))[0]).toMatchObject({ messages: 2 });

    // Stored after the previous run (created_at later than analytics_aggregated_at).
    await seedEvents(db, c.id, [
      {
        at: "2026-10-27T22:00:00.000Z",
        author: "late",
        channel: "ch9",
        storedAt: "2026-10-29T10:05:00.000Z",
      },
    ]);
    const result = await aggregation.aggregateCommunity(
      c.id,
      new Date("2026-10-29T10:15:00.000Z"),
    );
    expect(result).toMatchObject({ days: 1 });
    expect(await communityRows(db, c.id)).toEqual([
      { day: "2026-10-27", messages: 3, authors: 3 },
    ]);
    expect(
      (await channelRows(db, c.id)).find((r) => r.channel === "ch9"),
    ).toMatchObject({ messages: 1 });
  });

  it("picks up events stored just before the previous run (10 minute margin)", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, eventsOn("2026-10-27", 1));
    await aggregation.aggregateCommunity(c.id, NOW);
    await seedEvents(db, c.id, [
      {
        at: "2026-10-27T12:00:00.000Z",
        author: "x",
        storedAt: "2026-10-29T09:55:00.000Z",
      },
    ]);
    await aggregation.aggregateCommunity(
      c.id,
      new Date("2026-10-29T10:15:00Z"),
    );
    expect((await communityRows(db, c.id))[0]).toMatchObject({ messages: 2 });
  });

  it("never recomputes a day older than the retention cutoff", async () => {
    const c = await createCommunity(db);
    // A valid aggregate whose raw events were already purged (only a stray one is left).
    await seedEvents(db, c.id, eventsOn("2026-10-27", 1));
    await aggregation.aggregateCommunity(c.id, NOW);
    await db.communityDailyActivity.create({
      data: {
        communityId: c.id,
        day: new Date("2026-08-01T00:00:00Z"),
        messageCount: 99,
        authorCount: 5,
        aggregatedAt: NOW,
      },
    });
    await seedEvents(db, c.id, [
      { at: "2026-08-01T10:00:00.000Z", storedAt: "2026-10-29T10:05:00.000Z" },
    ]);
    await aggregation.aggregateCommunity(
      c.id,
      new Date("2026-10-29T10:15:00Z"),
    );
    const rows = await communityRows(db, c.id);
    expect(rows.find((r) => r.day === "2026-08-01")).toMatchObject({
      messages: 99,
      authors: 5,
    });
  });

  it("does not double count a message delivered twice", async () => {
    const c = await createCommunity(db);
    const dup = {
      at: "2026-10-27T10:00:00.000Z",
      messageId: "800000000000000001",
    };
    await seedEvents(db, c.id, [dup]);
    await seedEvents(db, c.id, [dup, { ...dup }]);
    expect(await rawCount(db, c.id)).toBe(1);
    await aggregation.aggregateCommunity(c.id, NOW);
    expect((await communityRows(db, c.id))[0]).toMatchObject({ messages: 1 });
    expect(await allTimeMessages(db, c.id)).toBe(1);
  });

  it("keeps communities isolated", async () => {
    const a = await createCommunity(db, "a");
    const b = await createCommunity(db, "b");
    await seedEvents(db, a.id, eventsOn("2026-10-27", 3, { channel: "same" }));
    await seedEvents(db, b.id, eventsOn("2026-10-27", 5, { channel: "same" }));
    await aggregation.aggregateCommunity(a.id, NOW);
    expect(await communityRows(db, b.id)).toEqual([]);
    expect((await watermark(db, b.id)).through).toBeNull();
    await aggregation.aggregateCommunity(b.id, NOW);
    expect(await communityRows(db, a.id)).toEqual([
      { day: "2026-10-27", messages: 3, authors: 3 },
    ]);
    expect(await communityRows(db, b.id)).toEqual([
      { day: "2026-10-27", messages: 5, authors: 5 },
    ]);
  });

  it("reports a missing community without writing", async () => {
    expect(await aggregation.aggregateCommunity("nope", NOW)).toEqual({
      status: "missing_community",
    });
  });

  it("two concurrent runs give the same result as one", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, [
      ...eventsOn("2026-10-20", 30),
      ...eventsOn("2026-10-27", 20, { channel: "ch2" }),
    ]);
    const results = await Promise.all([
      aggregation.aggregateCommunity(c.id, NOW),
      aggregation.aggregateCommunity(c.id, NOW),
    ]);
    expect(results.every((r) => r.status === "aggregated")).toBe(true);
    const concurrent = {
      community: await communityRows(db, c.id),
      channels: await channelRows(db, c.id),
      through: (await watermark(db, c.id)).through,
    };

    await resetTestDatabase(db);
    const solo = await createCommunity(db);
    await seedEvents(db, solo.id, [
      ...eventsOn("2026-10-20", 30),
      ...eventsOn("2026-10-27", 20, { channel: "ch2" }),
    ]);
    await aggregation.aggregateCommunity(solo.id, NOW);
    expect({
      community: await communityRows(db, solo.id),
      channels: await channelRows(db, solo.id),
      through: (await watermark(db, solo.id)).through,
    }).toEqual(concurrent);
  });

  it("a failed run changes nothing, and the next run converges", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, eventsOn("2026-10-27", 3));
    const flaky = createAggregationService({
      prisma: failingOnce(db),
      retentionDays: 30,
    });
    await expect(flaky.aggregateCommunity(c.id, NOW)).rejects.toThrow(
      "simulated crash",
    );
    // Rolled back: no rows, watermark untouched.
    expect(await communityRows(db, c.id)).toEqual([]);
    expect(await channelRows(db, c.id)).toEqual([]);
    expect(await watermark(db, c.id)).toEqual({ through: null, at: null });

    await flaky.aggregateCommunity(c.id, NOW);
    expect(await communityRows(db, c.id)).toEqual([
      { day: "2026-10-27", messages: 3, authors: 3 },
    ]);
    expect((await watermark(db, c.id)).through).toBe("2026-10-28");
  });

  it("the all-time total is the same before and after the watermark moves", async () => {
    const c = await createCommunity(db);
    await seedEvents(db, c.id, [
      ...eventsOn("2026-10-10", 4),
      ...eventsOn("2026-10-28", 2),
      ...eventsOn("2026-10-29", 3), // today stays raw
    ]);
    expect(await allTimeMessages(db, c.id)).toBe(9); // W null: all raw
    await aggregation.aggregateCommunity(c.id, NOW);
    expect(await allTimeMessages(db, c.id)).toBe(9); // aggregates <= W + raw > W
  });
});
