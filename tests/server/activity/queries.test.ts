import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  messageEvent: { aggregate: vi.fn(), findMany: vi.fn() },
  communityDailyActivity: { findMany: vi.fn(), aggregate: vi.fn() },
  channelDailyActivity: { groupBy: vi.fn() },
  discordChannel: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
}));

vi.mock("@/server/db", () => ({ getDb: () => db }));

import {
  getChannelBreakdown,
  getCommunityActivitySummary,
  getDailySeries,
  getEarliestAggregateDay,
  getHourlyHeatmap,
  getRecentActivity,
} from "@/server/activity/queries";

const NOW = new Date("2026-10-29T12:00:00.000Z");
const W = new Date("2026-10-28T00:00:00.000Z"); // yesterday is finalized
const T0 = new Date("2026-10-29T00:00:00.000Z"); // today 00:00Z
const H24 = new Date("2026-10-28T12:00:00.000Z");
const D7 = new Date("2026-10-23T00:00:00.000Z"); // today and the 6 previous days

type Call = [readonly string[], ...unknown[]];
const sql = (call: unknown) => (call as Call)[0].join("?");
const values = (call: unknown) => (call as Call).slice(1);
const rawCalls = () => db.$queryRaw.mock.calls;

/** Route tagged-template queries by their SQL text. */
function routeRaw(handlers: Record<string, unknown>) {
  db.$queryRaw.mockImplementation(async (...call: unknown[]) => {
    const text = sql(call);
    for (const [needle, rows] of Object.entries(handlers)) {
      if (text.includes(needle)) return rows;
    }
    return [];
  });
}

beforeEach(() => {
  db.messageEvent.aggregate.mockReset().mockResolvedValue({
    _min: { occurredAt: null },
    _max: { occurredAt: null },
  });
  db.messageEvent.findMany.mockReset().mockResolvedValue([]);
  db.communityDailyActivity.findMany.mockReset().mockResolvedValue([]);
  db.communityDailyActivity.aggregate
    .mockReset()
    .mockResolvedValue({ _min: { day: null } });
  db.channelDailyActivity.groupBy.mockReset().mockResolvedValue([]);
  db.discordChannel.findMany.mockReset().mockResolvedValue([]);
  db.$queryRaw.mockReset().mockResolvedValue([]);
});

describe("getCommunityActivitySummary", () => {
  it("returns zeros and nulls for a community without events", async () => {
    await expect(
      getCommunityActivitySummary("com_1", null, NOW),
    ).resolves.toEqual({
      totalEvents: 0,
      last24h: 0,
      last7d: 0,
      activeAuthors7d: 0,
      firstEventAt: null,
      lastEventAt: null,
    });
  });

  it("adds aggregates up to W and raw events after W, scoped to the community", async () => {
    await getCommunityActivitySummary("com_1", W, NOW);

    const totals = rawCalls().filter((c) =>
      sql(c).includes("community_daily_activity"),
    );
    expect(totals).toHaveLength(2); // all time and last 7 calendar days
    for (const call of totals) {
      const text = sql(call);
      expect(text).toMatch(/SUM\(message_count\)/);
      expect(text).toMatch(/day <= \?::date/);
      expect(text).toMatch(/occurred_at >= \?/);
      // community id is bound once per source (aggregate + raw)
      expect(values(call).filter((v) => v === "com_1")).toHaveLength(2);
    }
    // All time: aggregates from the beginning, raw from the day after W.
    expect(values(totals[0])).toEqual([
      "com_1",
      "0001-01-01",
      "2026-10-28",
      "com_1",
      new Date("2026-10-29T00:00:00.000Z"),
    ]);
    // Last 7 calendar days: aggregates from the range start, raw after W.
    expect(values(totals[1])).toEqual([
      "com_1",
      "2026-10-23",
      "2026-10-28",
      "com_1",
      new Date("2026-10-29T00:00:00.000Z"),
    ]);
  });

  it("reads everything from raw events while nothing is finalized", async () => {
    await getCommunityActivitySummary("com_1", null, NOW);
    const [allTime] = rawCalls().filter((c) =>
      sql(c).includes("community_daily_activity"),
    );
    // Aggregate window is empty (no day <= 0001-01-01) and raw starts at epoch.
    expect(values(allTime)).toEqual([
      "com_1",
      "0001-01-01",
      "0001-01-01",
      "com_1",
      new Date(0),
    ]);
  });

  it("uses an exact 24h cutoff and the 7-calendar-day start for the author count", async () => {
    await getCommunityActivitySummary("com_1", W, NOW);
    const call = rawCalls().find((c) => sql(c).includes("FILTER"));
    expect(sql(call)).toMatch(/occurred_at > \?/);
    expect(sql(call)).toMatch(/COUNT\(DISTINCT author_discord_id\)/);
    expect(values(call)).toEqual([H24, "com_1", D7]);
  });

  it("maps the totals, the 24h and author counts and the raw bounds", async () => {
    const first = new Date("2026-10-20T08:00:00.000Z");
    const last = new Date("2026-10-29T11:59:00.000Z");
    db.$queryRaw.mockImplementation(async (...call: unknown[]) =>
      sql(call).includes("FILTER")
        ? [{ last24h: 5, authors: 7 }]
        : [
            {
              total:
                values(call)[1] === "0001-01-01" &&
                values(call)[2] === "2026-10-28"
                  ? 50
                  : 20,
            },
          ],
    );
    db.messageEvent.aggregate.mockResolvedValue({
      _min: { occurredAt: first },
      _max: { occurredAt: last },
    });

    await expect(getCommunityActivitySummary("com_1", W, NOW)).resolves.toEqual(
      {
        totalEvents: 50,
        last24h: 5,
        last7d: 20,
        activeAuthors7d: 7,
        firstEventAt: first,
        lastEventAt: last,
      },
    );
    expect(db.messageEvent.aggregate).toHaveBeenCalledWith({
      where: { communityId: "com_1" },
      _min: { occurredAt: true },
      _max: { occurredAt: true },
    });
  });

  it("propagates database failures to the caller", async () => {
    db.$queryRaw.mockRejectedValue(new Error("db down"));
    await expect(getCommunityActivitySummary("com_1", W, NOW)).rejects.toThrow(
      "db down",
    );
  });
});

describe("getDailySeries", () => {
  it("reads aggregates for days <= W and raw only after W, zero-filling the rest", async () => {
    db.communityDailyActivity.findMany.mockResolvedValue([
      {
        day: new Date("2026-10-27T00:00:00.000Z"),
        messageCount: 10,
        authorCount: 3,
      },
      {
        day: new Date("2026-10-28T00:00:00.000Z"),
        messageCount: 20,
        authorCount: 4,
      },
    ]);
    routeRaw({
      message_events: [
        { day: "2026-10-28", messages: 999, authors: 9 }, // ignored: day <= W
        { day: "2026-10-29", messages: 6, authors: 2 },
      ],
    });

    const points = await getDailySeries("com_1", W, 7, NOW);

    expect(points).toHaveLength(7);
    expect(points.at(0)).toEqual({
      date: "2026-10-23",
      messages: 0,
      authors: 0,
    });
    expect(points.slice(-3)).toEqual([
      { date: "2026-10-27", messages: 10, authors: 3 },
      { date: "2026-10-28", messages: 20, authors: 4 },
      { date: "2026-10-29", messages: 6, authors: 2 },
    ]);
    expect(db.communityDailyActivity.findMany).toHaveBeenCalledWith({
      where: { communityId: "com_1", day: { gte: D7, lte: W } },
      select: { day: true, messageCount: true, authorCount: true },
    });
    // Raw is read only from the day after W.
    expect(values(rawCalls()[0])).toEqual(["com_1", T0]);
  });

  it("skips the aggregate query when nothing is finalized or the range is after W", async () => {
    await getDailySeries("com_1", null, 7, NOW);
    await getDailySeries("com_1", new Date("2026-10-01T00:00:00.000Z"), 7, NOW);
    expect(db.communityDailyActivity.findMany).not.toHaveBeenCalled();
  });
});

describe("getChannelBreakdown", () => {
  beforeEach(() => {
    db.channelDailyActivity.groupBy.mockResolvedValue([
      { discordChannelId: "c1", _sum: { messageCount: 30 } },
    ]);
    db.discordChannel.findMany.mockResolvedValue([
      { discordChannelId: "c1", name: "general" },
    ]);
  });

  it("combines channel aggregates (days <= W) with raw counts (days > W), names and shares", async () => {
    routeRaw({
      "COUNT(*)::int AS messages": [
        { channelId: "c1", messages: 10 },
        { channelId: "c2", messages: 60 },
      ],
      "DISTINCT author": [
        { channelId: "c1", authors: 4 },
        { channelId: "c2", authors: 9 },
      ],
    });

    const rows = await getChannelBreakdown("com_1", W, 30, NOW);

    expect(rows).toEqual([
      { channelId: "c2", name: null, messages: 60, share: 0.6, authors: 9 },
      {
        channelId: "c1",
        name: "general",
        messages: 40,
        share: 0.4,
        authors: 4,
      },
    ]);
    expect(db.channelDailyActivity.groupBy).toHaveBeenCalledWith({
      by: ["discordChannelId"],
      where: {
        communityId: "com_1",
        day: { gte: new Date("2026-09-30T00:00:00.000Z"), lte: W },
      },
      _sum: { messageCount: true },
    });
    // Names are looked up for this community only.
    expect(db.discordChannel.findMany).toHaveBeenCalledWith({
      where: { communityId: "com_1", discordChannelId: { in: ["c1", "c2"] } },
      select: { discordChannelId: true, name: true },
    });
  });

  it("does not offer per-channel distinct authors for a 90 day range", async () => {
    routeRaw({
      "COUNT(*)::int AS messages": [{ channelId: "c1", messages: 1 }],
    });
    const rows = await getChannelBreakdown("com_1", W, 90, NOW);
    expect(rows.every((r) => r.authors === null)).toBe(true);
    expect(rawCalls().some((c) => sql(c).includes("DISTINCT"))).toBe(false);
  });

  it("scopes every query to the community", async () => {
    await getChannelBreakdown("com_1", W, 7, NOW);
    for (const call of rawCalls()) expect(values(call)[0]).toBe("com_1");
  });
});

describe("getHourlyHeatmap", () => {
  it("is raw, UTC, and capped at 30 days even for a 90 day range", async () => {
    routeRaw({ "EXTRACT(DOW": [{ dow: 1, hour: 9, count: 3 }] });
    const map = await getHourlyHeatmap("com_1", 90, NOW);
    expect(map.cells[0]?.[9]).toBe(3);
    expect(sql(rawCalls()[0])).toMatch(/FROM message_events/);
    expect(values(rawCalls()[0])).toEqual([
      "com_1",
      new Date("2026-09-30T00:00:00.000Z"),
    ]);
  });
});

describe("getEarliestAggregateDay", () => {
  it("reads the earliest day of that community only", async () => {
    const day = new Date("2026-09-01T00:00:00.000Z");
    db.communityDailyActivity.aggregate.mockResolvedValue({ _min: { day } });
    await expect(getEarliestAggregateDay("com_1")).resolves.toEqual(day);
    expect(db.communityDailyActivity.aggregate).toHaveBeenCalledWith({
      where: { communityId: "com_1" },
      _min: { day: true },
    });
  });
});

describe("getRecentActivity", () => {
  it("is empty for a community without events and looks up no names", async () => {
    await expect(getRecentActivity("com_1")).resolves.toEqual([]);
    expect(db.discordChannel.findMany).not.toHaveBeenCalled();
  });

  it("queries only that community, newest first, selecting no content", async () => {
    await getRecentActivity("com_1");
    expect(db.messageEvent.findMany).toHaveBeenCalledWith({
      where: { communityId: "com_1" },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: 10,
      select: {
        id: true,
        occurredAt: true,
        discordChannelId: true,
        authorDiscordId: true,
      },
    });
  });

  it("maps rows to ids, time and the channel name (null when unknown)", async () => {
    const at = new Date("2026-10-29T11:00:00.000Z");
    db.messageEvent.findMany.mockResolvedValue([
      {
        id: "evt_1",
        occurredAt: at,
        discordChannelId: "c1",
        authorDiscordId: "a1",
      },
      {
        id: "evt_2",
        occurredAt: at,
        discordChannelId: "c9",
        authorDiscordId: "a2",
      },
    ]);
    db.discordChannel.findMany.mockResolvedValue([
      { discordChannelId: "c1", name: "general" },
    ]);
    const items = await getRecentActivity("com_1", 5);
    expect(items).toEqual([
      {
        id: "evt_1",
        occurredAt: at,
        channelId: "c1",
        channelName: "general",
        authorId: "a1",
      },
      {
        id: "evt_2",
        occurredAt: at,
        channelId: "c9",
        channelName: null,
        authorId: "a2",
      },
    ]);
    expect(db.discordChannel.findMany).toHaveBeenCalledTimes(1);
    expect(db.discordChannel.findMany).toHaveBeenCalledWith({
      where: { communityId: "com_1", discordChannelId: { in: ["c1", "c9"] } },
      select: { discordChannelId: true, name: true },
    });
  });

  it("clamps the limit to a sane range", async () => {
    await getRecentActivity("com_1", 10_000);
    await getRecentActivity("com_1", 0);
    await getRecentActivity("com_1", Number.NaN);
    const takes = db.messageEvent.findMany.mock.calls.map(
      ([arg]) => (arg as { take: number }).take,
    );
    expect(takes).toEqual([50, 10, 10]);
  });
});
