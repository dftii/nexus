import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveCommunity: vi.fn(),
  findUnique: vi.fn(),
  summary: vi.fn(),
  daily: vi.fn(),
  channels: vi.fn(),
  heatmap: vi.fn(),
  recent: vi.fn(),
  earliest: vi.fn(),
}));

vi.mock("@/server/communities", () => ({
  getActiveCommunity: mocks.getActiveCommunity,
}));
vi.mock("@/server/db", () => ({
  getDb: () => ({ community: { findUnique: mocks.findUnique } }),
}));
vi.mock("@/server/activity/queries", () => ({
  getCommunityActivitySummary: mocks.summary,
  getDailySeries: mocks.daily,
  getChannelBreakdown: mocks.channels,
  getHourlyHeatmap: mocks.heatmap,
  getRecentActivity: mocks.recent,
  getEarliestAggregateDay: mocks.earliest,
}));

import { getAnalyticsData } from "@/server/activity/analytics";

const NOW = new Date("2026-10-29T12:00:00.000Z");
const W = new Date("2026-10-28T00:00:00.000Z");
const FIRST = new Date("2026-10-01T08:00:00.000Z");

function community(id = "com_A") {
  return {
    id,
    discordGuildId: "111111111111111111",
    name: `Community ${id}`,
    iconUrl: null,
    role: "OWNER" as const,
    botConnected: true,
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    botConnectedAt: new Date("2026-10-01T00:00:00.000Z"),
    botLastSeenAt: new Date("2026-10-29T11:59:00.000Z"),
    analyticsFinalizedThrough: W,
    analyticsAggregatedAt: new Date("2026-10-29T11:45:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  mocks.getActiveCommunity.mockReset().mockResolvedValue(community());
  mocks.findUnique.mockReset().mockResolvedValue(row());
  mocks.summary.mockReset().mockResolvedValue({
    totalEvents: 5,
    last24h: 1,
    last7d: 3,
    activeAuthors7d: 2,
    firstEventAt: FIRST,
    lastEventAt: NOW,
  });
  mocks.daily.mockReset().mockResolvedValue([]);
  mocks.channels.mockReset().mockResolvedValue([]);
  mocks.heatmap.mockReset().mockResolvedValue({ cells: [], max: 0, total: 0 });
  mocks.recent.mockReset().mockResolvedValue([]);
  mocks.earliest
    .mockReset()
    .mockResolvedValue(new Date("2026-10-02T00:00:00.000Z"));
});

describe("getAnalyticsData", () => {
  it("returns null without a community and queries nothing", async () => {
    mocks.getActiveCommunity.mockResolvedValue(null);
    await expect(getAnalyticsData("user_1", 30, NOW)).resolves.toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.summary).not.toHaveBeenCalled();
  });

  it("scopes every query to the active community and passes its watermark and range", async () => {
    const data = await getAnalyticsData("user_1", 90, NOW);

    expect(data).toMatchObject({
      status: "ok",
      community: { id: "com_A" },
      bot: { status: "online" },
      activity: {
        range: 90,
        heatmapDays: 30,
        coverage: { finalizedThrough: W, stale: false, earliestRawAt: FIRST },
      },
    });
    expect(mocks.summary).toHaveBeenCalledWith("com_A", W, NOW);
    expect(mocks.daily).toHaveBeenCalledWith("com_A", W, 90, NOW);
    expect(mocks.channels).toHaveBeenCalledWith("com_A", W, 90, NOW);
    expect(mocks.heatmap).toHaveBeenCalledWith("com_A", 90, NOW);
    expect(mocks.recent).toHaveBeenCalledWith("com_A", 25);
    expect(mocks.earliest).toHaveBeenCalledWith("com_A");
    expect(mocks.getActiveCommunity).toHaveBeenCalledTimes(1);
    expect(mocks.getActiveCommunity).toHaveBeenCalledWith("user_1");
    expect(JSON.stringify(mocks.findUnique.mock.calls)).not.toContain("com_B");
  });

  it("flags stale daily totals", async () => {
    mocks.findUnique.mockResolvedValue(
      row({ analyticsFinalizedThrough: new Date("2026-10-25T00:00:00.000Z") }),
    );
    const data = await getAnalyticsData("user_1", 30, NOW);
    expect(data).toMatchObject({ activity: { coverage: { stale: true } } });
  });

  it("skips all activity queries while the bot is not installed", async () => {
    mocks.findUnique.mockResolvedValue(
      row({ botConnectedAt: null, botLastSeenAt: null }),
    );
    const data = await getAnalyticsData("user_1", 30, NOW);
    expect(data).toMatchObject({
      status: "ok",
      activity: null,
      bot: { status: "not_installed" },
    });
    expect(mocks.summary).not.toHaveBeenCalled();
    expect(mocks.daily).not.toHaveBeenCalled();
  });

  it("keeps the data when the bot is offline", async () => {
    mocks.findUnique.mockResolvedValue(
      row({ botLastSeenAt: new Date("2026-10-29T10:00:00.000Z") }),
    );
    const data = await getAnalyticsData("user_1", 30, NOW);
    expect(data).toMatchObject({
      bot: { status: "offline" },
      activity: { range: 30 },
    });
  });

  it("turns any query failure into a generic error state, keeping the community", async () => {
    mocks.channels.mockRejectedValue(
      new Error("password authentication failed"),
    );
    const data = await getAnalyticsData("user_1", 30, NOW);
    expect(data).toEqual({ status: "error", community: community() });
    expect(JSON.stringify(data)).not.toMatch(/password/);
  });
});
