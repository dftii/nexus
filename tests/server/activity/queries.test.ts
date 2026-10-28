import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  messageEvent: {
    count: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
}));

vi.mock("@/server/db", () => ({ getDb: () => db }));

import {
  getCommunityActivitySummary,
  getRecentActivity,
} from "@/server/activity/queries";

const NOW = new Date("2026-10-29T12:00:00.000Z");
const H24 = new Date("2026-10-28T12:00:00.000Z");
const D7 = new Date("2026-10-22T12:00:00.000Z");

beforeEach(() => {
  db.messageEvent.count.mockReset().mockResolvedValue(0);
  db.messageEvent.aggregate.mockReset().mockResolvedValue({
    _min: { occurredAt: null },
    _max: { occurredAt: null },
  });
  db.messageEvent.findMany.mockReset().mockResolvedValue([]);
  db.$queryRaw.mockReset().mockResolvedValue([{ authors: 0 }]);
});

describe("getCommunityActivitySummary", () => {
  it("returns zeros and nulls for a community without events", async () => {
    await expect(getCommunityActivitySummary("com_1", NOW)).resolves.toEqual({
      totalEvents: 0,
      last24h: 0,
      last7d: 0,
      activeAuthors7d: 0,
      firstEventAt: null,
      lastEventAt: null,
    });
  });

  it("scopes every query to the given community and uses the 24h / 7d windows", async () => {
    await getCommunityActivitySummary("com_1", NOW);

    const wheres = db.messageEvent.count.mock.calls.map(
      ([arg]) => (arg as { where: unknown }).where,
    );
    expect(wheres).toEqual([
      { communityId: "com_1" },
      { communityId: "com_1", occurredAt: { gte: H24 } },
      { communityId: "com_1", occurredAt: { gte: D7 } },
    ]);
    expect(db.messageEvent.aggregate).toHaveBeenCalledWith({
      where: { communityId: "com_1" },
      _min: { occurredAt: true },
      _max: { occurredAt: true },
    });

    // Tagged template: [strings, ...values]. Only this community and the 7d
    // lower bound are bound; the SQL itself filters on community_id.
    const [strings, ...values] = db.$queryRaw.mock.calls[0] as [
      string[],
      ...unknown[],
    ];
    expect(strings.join("?")).toMatch(/COUNT\(DISTINCT author_discord_id\)/);
    expect(strings.join("?")).toMatch(/WHERE community_id = \?/);
    expect(values).toEqual(["com_1", D7]);
  });

  it("maps counts, distinct authors and event bounds", async () => {
    const first = new Date("2026-10-20T08:00:00.000Z");
    const last = new Date("2026-10-29T11:59:00.000Z");
    db.messageEvent.count
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(20);
    db.messageEvent.aggregate.mockResolvedValue({
      _min: { occurredAt: first },
      _max: { occurredAt: last },
    });
    db.$queryRaw.mockResolvedValue([{ authors: 7 }]);

    await expect(getCommunityActivitySummary("com_1", NOW)).resolves.toEqual({
      totalEvents: 50,
      last24h: 5,
      last7d: 20,
      activeAuthors7d: 7,
      firstEventAt: first,
      lastEventAt: last,
    });
  });

  it("propagates database failures to the caller", async () => {
    db.messageEvent.count.mockRejectedValue(new Error("db down"));
    await expect(getCommunityActivitySummary("com_1", NOW)).rejects.toThrow(
      "db down",
    );
  });
});

describe("getRecentActivity", () => {
  it("is empty for a community without events", async () => {
    await expect(getRecentActivity("com_1")).resolves.toEqual([]);
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

  it("maps rows to ids and time only", async () => {
    const at = new Date("2026-10-29T11:00:00.000Z");
    db.messageEvent.findMany.mockResolvedValue([
      {
        id: "evt_1",
        occurredAt: at,
        discordChannelId: "c1",
        authorDiscordId: "a1",
      },
    ]);
    const items = await getRecentActivity("com_1", 5);
    expect(items).toEqual([
      { id: "evt_1", occurredAt: at, channelId: "c1", authorId: "a1" },
    ]);
    expect(Object.keys(items[0] ?? {}).sort()).toEqual([
      "authorId",
      "channelId",
      "id",
      "occurredAt",
    ]);
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
