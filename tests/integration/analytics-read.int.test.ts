import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  createTestPrisma,
  hasTestDatabase,
  resetTestDatabase,
} from "../helpers/test-db";

// The read functions call getDb(); point it (and the community lookup) at the
// disposable test database.
const holder = vi.hoisted(() => ({
  db: null as unknown,
  activeCommunity: null as unknown,
}));
vi.mock("@/server/db", () => ({ getDb: () => holder.db }));
vi.mock("@/server/communities", () => ({
  getActiveCommunity: async () => holder.activeCommunity,
}));

import { getAnalyticsData } from "@/server/activity/analytics";
import {
  getChannelBreakdown,
  getCommunityActivitySummary,
  getDailySeries,
  getEarliestAggregateDay,
  getHourlyHeatmap,
  getRecentActivity,
} from "@/server/activity/queries";

const NOW = new Date("2026-10-29T12:00:00.000Z");
const W = new Date("2026-10-27T00:00:00.000Z");
const at = (iso: string) => new Date(iso);
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const aggregatedAt = at("2026-10-29T11:45:00.000Z");

describe.skipIf(!hasTestDatabase)("analytics read side (PostgreSQL)", () => {
  let db: PrismaClient;
  let A = "";
  let B = "";
  let C = "";
  let seq = 0;

  beforeAll(() => {
    db = createTestPrisma();
    holder.db = db;
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  async function community(name: string, finalizedThrough: Date | null) {
    const row = await db.community.create({
      data: {
        discordGuildId: `guild_${name}_${++seq}`,
        name,
        botConnectedAt: day("2026-10-01"),
        botLastSeenAt: NOW,
        analyticsFinalizedThrough: finalizedThrough,
        analyticsAggregatedAt: finalizedThrough ? aggregatedAt : null,
      },
    });
    return row.id;
  }

  const raw = (
    communityId: string,
    occurredAt: string,
    channel: string,
    author: string,
  ) => ({
    communityId,
    discordMessageId: `m_${++seq}`,
    discordGuildId: "g",
    discordChannelId: channel,
    authorDiscordId: author,
    occurredAt: at(occurredAt),
  });

  beforeEach(async () => {
    await resetTestDatabase(db);
    seq = 0;
    A = await community("A", W);
    B = await community("B", W);
    C = await community("C", null);

    // Community A: aggregates up to W (the oldest days have no raw left).
    await db.communityDailyActivity.createMany({
      data: [
        {
          communityId: A,
          day: day("2026-10-20"),
          messageCount: 10,
          authorCount: 3,
          aggregatedAt,
        },
        {
          communityId: A,
          day: day("2026-10-26"),
          messageCount: 5,
          authorCount: 2,
          aggregatedAt,
        },
        {
          communityId: A,
          day: day("2026-10-27"),
          messageCount: 8,
          authorCount: 3,
          aggregatedAt,
        },
      ],
    });
    await db.channelDailyActivity.createMany({
      data: [
        {
          communityId: A,
          day: day("2026-10-20"),
          discordChannelId: "c1",
          messageCount: 6,
          authorCount: 2,
          aggregatedAt,
        },
        {
          communityId: A,
          day: day("2026-10-20"),
          discordChannelId: "c2",
          messageCount: 4,
          authorCount: 2,
          aggregatedAt,
        },
        {
          communityId: A,
          day: day("2026-10-26"),
          discordChannelId: "c1",
          messageCount: 5,
          authorCount: 2,
          aggregatedAt,
        },
        {
          communityId: A,
          day: day("2026-10-27"),
          discordChannelId: "c1",
          messageCount: 3,
          authorCount: 2,
          aggregatedAt,
        },
        {
          communityId: A,
          day: day("2026-10-27"),
          discordChannelId: "c2",
          messageCount: 5,
          authorCount: 2,
          aggregatedAt,
        },
      ],
    });
    await db.messageEvent.createMany({
      data: [
        // Day == W with raw still present: the aggregate wins, this is ignored.
        raw(A, "2026-10-27T23:59:59.999Z", "c1", "a9"),
        // First instant after W, and exactly 24 h before NOW (excluded by > cutoff).
        raw(A, "2026-10-28T00:00:00.000Z", "c1", "a1"),
        raw(A, "2026-10-28T12:00:00.000Z", "c1", "a4"),
        raw(A, "2026-10-28T13:00:00.000Z", "c2", "a2"),
        raw(A, "2026-10-28T13:30:00.000Z", "c2", "a1"),
        raw(A, "2026-10-29T01:00:00.000Z", "c1", "a1"),
        raw(A, "2026-10-29T11:00:00.000Z", "c1", "a3"),
      ],
    });
    // Community B: different data in the same shape, and a channel name for an
    // id that A also uses (it must not leak into A).
    await db.communityDailyActivity.create({
      data: {
        communityId: B,
        day: day("2026-10-27"),
        messageCount: 1000,
        authorCount: 50,
        aggregatedAt,
      },
    });
    await db.channelDailyActivity.create({
      data: {
        communityId: B,
        day: day("2026-10-27"),
        discordChannelId: "c3",
        messageCount: 1000,
        authorCount: 50,
        aggregatedAt,
      },
    });
    await db.messageEvent.createMany({
      data: [
        raw(B, "2026-10-28T10:00:00.000Z", "c3", "b1"),
        raw(B, "2026-10-29T10:00:00.000Z", "c3", "b2"),
      ],
    });
    // Community C: nothing finalized, everything is raw.
    await db.messageEvent.createMany({
      data: [
        raw(C, "2026-10-01T10:00:00.000Z", "c4", "x1"),
        raw(C, "2026-10-29T09:00:00.000Z", "c4", "x2"),
      ],
    });
    await db.discordChannel.createMany({
      data: [
        {
          discordChannelId: "c1",
          communityId: A,
          discordGuildId: "g",
          name: "general",
          type: 0,
        },
        {
          discordChannelId: "c2",
          communityId: B,
          discordGuildId: "g",
          name: "belongs-to-b",
          type: 0,
        },
        {
          discordChannelId: "c3",
          communityId: B,
          discordGuildId: "g",
          name: "b-only",
          type: 0,
        },
      ],
    });
  });

  it("all-time total = aggregates up to W + raw after W, never both for one day", async () => {
    const summary = await getCommunityActivitySummary(A, W, NOW);
    // 10 + 5 + 8 from aggregates, 6 raw events after W (the day-W raw is ignored).
    expect(summary.totalEvents).toBe(29);
    expect(summary.firstEventAt).toEqual(at("2026-10-27T23:59:59.999Z"));
    expect(summary.lastEventAt).toEqual(at("2026-10-29T11:00:00.000Z"));
  });

  it("counts the last 24 hours with an exact timestamp cutoff", async () => {
    const summary = await getCommunityActivitySummary(A, W, NOW);
    // 12:00:00.000 yesterday is exactly the cutoff and is excluded.
    expect(summary.last24h).toBe(4);
  });

  it("counts the last 7 calendar days and their distinct authors across days", async () => {
    const summary = await getCommunityActivitySummary(A, W, NOW);
    // Days 10-23..10-29: aggregates 5 + 8, raw after W 6.
    expect(summary.last7d).toBe(19);
    // a9, a1, a4, a2, a3: a1 wrote on two days and counts once.
    expect(summary.activeAuthors7d).toBe(5);
    const daily = await getDailySeries(A, W, 7, NOW);
    const summedDailyAuthors = daily.reduce((n, p) => n + p.authors, 0);
    expect(summedDailyAuthors).toBeGreaterThan(summary.activeAuthors7d);
  });

  it("builds the daily series across W from the right source, zero-filled", async () => {
    const daily = await getDailySeries(A, W, 7, NOW);
    expect(daily).toEqual([
      { date: "2026-10-23", messages: 0, authors: 0 },
      { date: "2026-10-24", messages: 0, authors: 0 },
      { date: "2026-10-25", messages: 0, authors: 0 },
      { date: "2026-10-26", messages: 5, authors: 2 },
      { date: "2026-10-27", messages: 8, authors: 3 }, // aggregate, not the 1 raw row
      { date: "2026-10-28", messages: 4, authors: 3 }, // raw
      { date: "2026-10-29", messages: 2, authors: 2 }, // raw (today)
    ]);
  });

  it("makes the daily series, channel sums and the all-time total agree", async () => {
    for (const range of [7, 30, 90]) {
      const daily = await getDailySeries(A, W, range, NOW);
      const channels = await getChannelBreakdown(A, W, range, NOW);
      const dailyTotal = daily.reduce((n, p) => n + p.messages, 0);
      expect(channels.reduce((n, c) => n + c.messages, 0)).toBe(dailyTotal);
      expect(channels.reduce((n, c) => n + c.share, 0)).toBeCloseTo(1);
    }
    // 30 days reach back to 09-30, so they cover every aggregate: = all time.
    const all = await getCommunityActivitySummary(A, W, NOW);
    const daily30 = await getDailySeries(A, W, 30, NOW);
    expect(daily30.reduce((n, p) => n + p.messages, 0)).toBe(all.totalEvents);
  });

  it("breaks channels down with names, shares and exact authors for <= 30 days", async () => {
    const seven = await getChannelBreakdown(A, W, 7, NOW);
    expect(seven).toEqual([
      // c1: 5 + 3 aggregated, 4 raw; authors a9 a1 a4 a3
      {
        channelId: "c1",
        name: "general",
        messages: 12,
        share: 12 / 19,
        authors: 4,
      },
      // c2 belongs to community B in discord_channels: no name leaks into A
      { channelId: "c2", name: null, messages: 7, share: 7 / 19, authors: 2 },
    ]);
    const ninety = await getChannelBreakdown(A, W, 90, NOW);
    expect(ninety.map((c) => c.authors)).toEqual([null, null]);
    expect(ninety.map((c) => c.messages)).toEqual([18, 11]);
  });

  it("builds the UTC hour x weekday heatmap from raw events, capped at 30 days", async () => {
    const heat = await getHourlyHeatmap(A, 90, NOW);
    expect(heat.total).toBe(7); // every raw row of A, including the day-W one
    const monFirst = (iso: string) => (at(iso).getUTCDay() + 6) % 7;
    expect(heat.cells[monFirst("2026-10-29T11:00:00.000Z")]?.[11]).toBe(1);
    expect(heat.cells[monFirst("2026-10-28T13:00:00.000Z")]?.[13]).toBe(2);
    expect(heat.max).toBe(2);
  });

  it("reads the earliest aggregate day and recent events with channel names", async () => {
    await expect(getEarliestAggregateDay(A)).resolves.toEqual(
      day("2026-10-20"),
    );
    await expect(getEarliestAggregateDay(C)).resolves.toBeNull();
    const recent = await getRecentActivity(A, 3);
    expect(recent.map((r) => [r.channelId, r.channelName, r.authorId])).toEqual(
      [
        ["c1", "general", "a3"],
        ["c1", "general", "a1"],
        ["c2", null, "a1"],
      ],
    );
  });

  it("falls back to raw events for everything while nothing is finalized", async () => {
    const summary = await getCommunityActivitySummary(C, null, NOW);
    expect(summary).toMatchObject({
      totalEvents: 2,
      last24h: 1,
      last7d: 1,
      activeAuthors7d: 1,
    });
    const daily = await getDailySeries(C, null, 30, NOW);
    expect(daily.reduce((n, p) => n + p.messages, 0)).toBe(2);
    expect(daily.at(-1)).toEqual({
      date: "2026-10-29",
      messages: 1,
      authors: 1,
    });
  });

  it("isolates communities from each other in every read", async () => {
    const [a, b] = [
      await getCommunityActivitySummary(A, W, NOW),
      await getCommunityActivitySummary(B, W, NOW),
    ];
    expect(a.totalEvents).toBe(29);
    expect(b.totalEvents).toBe(1002); // 1000 aggregated + 2 raw after W
    const channelsA = await getChannelBreakdown(A, W, 90, NOW);
    expect(channelsA.map((c) => c.channelId)).not.toContain("c3");
    const channelsB = await getChannelBreakdown(B, W, 90, NOW);
    expect(channelsB.map((c) => [c.channelId, c.name, c.messages])).toEqual([
      ["c3", "b-only", 1002],
    ]);
    expect(
      (await getRecentActivity(B)).every((r) => r.channelId === "c3"),
    ).toBe(true);
    expect((await getHourlyHeatmap(B, 30, NOW)).total).toBe(2);
  });

  it("assembles the whole analytics payload for the active community only", async () => {
    holder.activeCommunity = {
      id: A,
      discordGuildId: "guild_A",
      name: "A",
      iconUrl: null,
      role: "OWNER",
      botConnected: true,
    };
    const data = await getAnalyticsData("user_1", 7, NOW);
    expect(data).toMatchObject({
      status: "ok",
      bot: { status: "online" },
      activity: {
        range: 7,
        summary: { totalEvents: 29, last24h: 4, last7d: 19 },
        coverage: {
          finalizedThrough: W,
          earliestAggregateDay: day("2026-10-20"),
          // W is two days back and it is past 01:00 UTC: totals are late.
          stale: true,
        },
      },
    });
    if (data?.status !== "ok" || !data.activity) throw new Error("unreachable");
    expect(data.activity.daily).toHaveLength(7);
    expect(data.activity.channels.map((c) => c.channelId)).toEqual([
      "c1",
      "c2",
    ]);
  });
});
