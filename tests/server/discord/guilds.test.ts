import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "../../helpers/fake-db";

const fake = vi.hoisted(() => ({ current: undefined as unknown }));
const tokens = vi.hoisted(() => ({ get: vi.fn() }));
const api = vi.hoisted(() => ({ fetchGuilds: vi.fn() }));

vi.mock("@/server/db", () => ({ getDb: () => fake.current }));
vi.mock("@/server/discord/tokens", () => ({
  getValidDiscordAccessToken: tokens.get,
}));
vi.mock("@/server/discord/api", () => ({
  fetchCurrentUserGuilds: api.fetchGuilds,
}));

import { getEligibleGuilds } from "@/server/discord/guilds";
import { buildGuildIconUrl } from "@/server/discord/cdn";

const G_OWNER = "100000000000000001";
const G_ADMIN = "100000000000000002";
const G_MANAGE = "100000000000000003";
const G_MEMBER = "100000000000000004";

const discordGuilds = [
  {
    id: G_MEMBER,
    name: "Just a member",
    icon: null,
    owner: false,
    permissions: "0",
  },
  {
    id: G_MANAGE,
    name: "Alpha manage",
    icon: "abc",
    owner: false,
    permissions: "32",
  },
  {
    id: G_ADMIN,
    name: "Beta admin",
    icon: "a_anim",
    owner: false,
    permissions: "8",
  },
  {
    id: G_OWNER,
    name: "Zeta owned",
    icon: null,
    owner: true,
    permissions: "0",
  },
];

let ctx: ReturnType<typeof createFakeDb>;

beforeEach(() => {
  ctx = createFakeDb();
  fake.current = ctx.db;
  tokens.get.mockReset().mockResolvedValue({ ok: true, accessToken: "tok" });
  api.fetchGuilds
    .mockReset()
    .mockResolvedValue({ ok: true, guilds: discordGuilds });
});

describe("getEligibleGuilds", () => {
  it("keeps only owner / administrator / manage server guilds, strongest first", async () => {
    const result = await getEligibleGuilds("user_1");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.guilds.map((g) => [g.id, g.reason])).toEqual([
      [G_OWNER, "owner"],
      [G_ADMIN, "administrator"],
      [G_MANAGE, "manage_server"],
    ]);
  });

  it("annotates guilds already in NEXUS, bot state and the user's own membership", async () => {
    ctx.state.communities.push(
      {
        id: "com_a",
        discordGuildId: G_ADMIN,
        name: "Beta admin",
        iconUrl: null,
        ownerId: null,
        botConnectedAt: new Date(),
      },
      {
        id: "com_m",
        discordGuildId: G_MANAGE,
        name: "Alpha manage",
        iconUrl: null,
        ownerId: null,
        botConnectedAt: null,
      },
    );
    ctx.state.memberships.push({
      id: "mem_1",
      userId: "user_1",
      communityId: "com_a",
      role: "ADMIN",
      joinedAt: new Date(),
      lastVerifiedAt: null,
    });
    // Another user's membership must not count as the viewer's.
    ctx.state.memberships.push({
      id: "mem_2",
      userId: "user_2",
      communityId: "com_m",
      role: "ADMIN",
      joinedAt: new Date(),
      lastVerifiedAt: null,
    });

    const result = await getEligibleGuilds("user_1");
    if (result.status !== "ok") throw new Error("expected ok");
    const byId = Object.fromEntries(result.guilds.map((g) => [g.id, g]));
    expect(byId[G_OWNER]).toMatchObject({
      inNexus: false,
      communityId: null,
      botConnected: false,
      alreadySelected: false,
    });
    expect(byId[G_ADMIN]).toMatchObject({
      inNexus: true,
      communityId: "com_a",
      botConnected: true,
      alreadySelected: true,
    });
    expect(byId[G_MANAGE]).toMatchObject({
      inNexus: true,
      botConnected: false,
      alreadySelected: false,
    });
  });

  it("builds CDN icon URLs and uses null without an icon", async () => {
    const result = await getEligibleGuilds("user_1");
    if (result.status !== "ok") throw new Error("expected ok");
    const byId = Object.fromEntries(result.guilds.map((g) => [g.id, g]));
    expect(byId[G_MANAGE]?.iconUrl).toBe(
      `https://cdn.discordapp.com/icons/${G_MANAGE}/abc.png?size=128`,
    );
    expect(byId[G_OWNER]?.iconUrl).toBeNull();
  });

  it("returns an empty list when nothing is eligible", async () => {
    api.fetchGuilds.mockResolvedValue({ ok: true, guilds: [discordGuilds[0]] });
    expect(await getEligibleGuilds("user_1")).toEqual({
      status: "ok",
      guilds: [],
    });
  });

  it("maps token problems", async () => {
    tokens.get.mockResolvedValue({ ok: false, reason: "reauth_required" });
    expect(await getEligibleGuilds("user_1")).toEqual({
      status: "reauth_required",
    });
    tokens.get.mockResolvedValue({ ok: false, reason: "unavailable" });
    expect(await getEligibleGuilds("user_1")).toEqual({
      status: "unavailable",
    });
    expect(api.fetchGuilds).not.toHaveBeenCalled();
  });

  it("maps Discord API failures", async () => {
    api.fetchGuilds.mockResolvedValue({ ok: false, kind: "unauthorized" });
    expect(await getEligibleGuilds("user_1")).toEqual({
      status: "reauth_required",
    });
    api.fetchGuilds.mockResolvedValue({
      ok: false,
      kind: "rate_limited",
      retryAfter: 12,
    });
    expect(await getEligibleGuilds("user_1")).toEqual({
      status: "rate_limited",
      retryAfter: 12,
    });
    for (const kind of ["unavailable", "invalid_response"]) {
      api.fetchGuilds.mockResolvedValue({ ok: false, kind });
      expect(await getEligibleGuilds("user_1")).toEqual({
        status: "unavailable",
      });
    }
  });

  it("reports unavailable instead of throwing when the database fails", async () => {
    ctx.db.community.findMany = async () => {
      throw new Error("connection refused");
    };
    expect(await getEligibleGuilds("user_1")).toEqual({
      status: "unavailable",
    });
  });
});

describe("buildGuildIconUrl", () => {
  it("returns null for missing icons and rejects odd hashes", () => {
    expect(buildGuildIconUrl(G_OWNER, null)).toBeNull();
    expect(buildGuildIconUrl(G_OWNER, "")).toBeNull();
    expect(buildGuildIconUrl(G_OWNER, "../evil")).toBeNull();
    expect(buildGuildIconUrl("nope", "abc")).toBeNull();
  });

  it("builds a PNG URL, also for animated icons", () => {
    expect(buildGuildIconUrl(G_OWNER, "a_deadbeef")).toBe(
      `https://cdn.discordapp.com/icons/${G_OWNER}/a_deadbeef.png?size=128`,
    );
  });
});
