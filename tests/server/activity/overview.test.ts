import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveCommunity: vi.fn(),
  findUnique: vi.fn(),
  summary: vi.fn(),
  recent: vi.fn(),
}));

vi.mock("@/server/communities", () => ({
  getActiveCommunity: mocks.getActiveCommunity,
}));
vi.mock("@/server/db", () => ({
  getDb: () => ({ community: { findUnique: mocks.findUnique } }),
}));
vi.mock("@/server/activity/queries", () => ({
  getCommunityActivitySummary: mocks.summary,
  getRecentActivity: mocks.recent,
}));

import { getOverviewData } from "@/server/activity/overview";

const NOW = new Date("2026-10-29T12:00:00.000Z");
const SUMMARY = {
  totalEvents: 3,
  last24h: 2,
  last7d: 3,
  activeAuthors7d: 2,
  firstEventAt: new Date("2026-10-28T00:00:00.000Z"),
  lastEventAt: new Date("2026-10-29T11:00:00.000Z"),
};

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

beforeEach(() => {
  mocks.getActiveCommunity.mockReset().mockResolvedValue(community());
  mocks.findUnique.mockReset().mockResolvedValue({
    botConnectedAt: new Date("2026-10-28T00:00:00.000Z"),
    botLastSeenAt: new Date("2026-10-29T11:59:00.000Z"),
  });
  mocks.summary.mockReset().mockResolvedValue(SUMMARY);
  mocks.recent.mockReset().mockResolvedValue([]);
});

describe("getOverviewData", () => {
  it("returns null when the user has no community and queries nothing else", async () => {
    mocks.getActiveCommunity.mockResolvedValue(null);
    await expect(getOverviewData("user_1", NOW)).resolves.toBeNull();
    expect(mocks.getActiveCommunity).toHaveBeenCalledWith("user_1");
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.summary).not.toHaveBeenCalled();
  });

  it("builds an online overview from the active community only", async () => {
    const data = await getOverviewData("user_1", NOW);
    expect(data).toMatchObject({
      status: "ok",
      community: { id: "com_A" },
      bot: {
        status: "online",
        connectedAt: new Date("2026-10-28T00:00:00.000Z"),
        lastSeenAt: new Date("2026-10-29T11:59:00.000Z"),
      },
      activity: { summary: SUMMARY, recent: [] },
    });
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "com_A" },
      select: { botConnectedAt: true, botLastSeenAt: true },
    });
    expect(mocks.summary).toHaveBeenCalledWith("com_A", NOW);
    expect(mocks.recent).toHaveBeenCalledWith("com_A");
  });

  it("reports offline when the last heartbeat is stale, keeping the metrics", async () => {
    mocks.findUnique.mockResolvedValue({
      botConnectedAt: new Date("2026-10-28T00:00:00.000Z"),
      botLastSeenAt: new Date("2026-10-29T11:50:00.000Z"),
    });
    const data = await getOverviewData("user_1", NOW);
    expect(data).toMatchObject({
      status: "ok",
      bot: { status: "offline" },
      activity: { summary: SUMMARY },
    });
  });

  it("skips the activity queries while the bot is not installed", async () => {
    mocks.findUnique.mockResolvedValue({
      botConnectedAt: null,
      botLastSeenAt: null,
    });
    const data = await getOverviewData("user_1", NOW);
    expect(data).toMatchObject({
      status: "ok",
      bot: { status: "not_installed" },
      activity: null,
    });
    expect(mocks.summary).not.toHaveBeenCalled();
    expect(mocks.recent).not.toHaveBeenCalled();
  });

  it("scopes everything to the user's active community, never another one", async () => {
    // Another community exists, but only A is the user's active community.
    mocks.getActiveCommunity.mockImplementation(async (userId: string) =>
      userId === "user_A" ? community("com_A") : community("com_B"),
    );
    await getOverviewData("user_A", NOW);

    const used = [
      (mocks.findUnique.mock.calls[0]?.[0] as { where: { id: string } }).where
        .id,
      mocks.summary.mock.calls[0]?.[0],
      mocks.recent.mock.calls[0]?.[0],
    ];
    expect(used).toEqual(["com_A", "com_A", "com_A"]);
    expect(JSON.stringify(mocks.findUnique.mock.calls)).not.toContain("com_B");
    expect(mocks.getActiveCommunity).toHaveBeenCalledTimes(1);
    expect(mocks.getActiveCommunity).toHaveBeenCalledWith("user_A");
  });

  it("turns an activity query failure into an error state that keeps the community", async () => {
    mocks.summary.mockRejectedValue(new Error("connection refused"));
    const data = await getOverviewData("user_1", NOW);
    expect(data).toEqual({ status: "error", community: community() });
  });

  it("turns a failure loading the community into an error state without one", async () => {
    mocks.getActiveCommunity.mockRejectedValue(new Error("db down"));
    await expect(getOverviewData("user_1", NOW)).resolves.toEqual({
      status: "error",
      community: null,
    });
  });

  it("reports an error if the community row vanished", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(getOverviewData("user_1", NOW)).resolves.toEqual({
      status: "error",
      community: community(),
    });
  });
});
