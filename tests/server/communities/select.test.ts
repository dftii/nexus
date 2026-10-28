import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "../../helpers/fake-db";

const fake = vi.hoisted(() => ({ current: undefined as unknown }));
const guildsMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/server/db", () => ({ getDb: () => fake.current }));
vi.mock("@/server/discord/guilds", () => ({
  getEligibleGuilds: guildsMock.get,
}));

import { selectCommunity } from "@/server/communities/select";

const G_OWNED = "200000000000000001";
const G_ADMIN = "200000000000000002";
const G_OTHER = "200000000000000099";

function guild(
  id: string,
  reason: "owner" | "administrator" | "manage_server",
) {
  return {
    id,
    name: `Guild ${id.slice(-2)}`,
    iconUrl: null,
    reason,
    inNexus: false,
    communityId: null,
    botConnected: false,
    alreadySelected: false,
  };
}

let ctx: ReturnType<typeof createFakeDb>;

beforeEach(() => {
  ctx = createFakeDb();
  fake.current = ctx.db;
  guildsMock.get.mockReset().mockResolvedValue({
    status: "ok",
    guilds: [guild(G_OWNED, "owner"), guild(G_ADMIN, "administrator")],
  });
});

describe("selectCommunity", () => {
  it.each(["", "abc", "123", "1".repeat(30), null, undefined, 42])(
    "rejects an invalid guild id %j without calling Discord",
    async (value) => {
      expect(await selectCommunity("user_1", value)).toEqual({
        status: "invalid",
      });
      expect(guildsMock.get).not.toHaveBeenCalled();
    },
  );

  it("forbids a guild that is not in the user's eligible list", async () => {
    expect(await selectCommunity("user_1", G_OTHER)).toEqual({
      status: "forbidden",
    });
    expect(ctx.state.communities).toHaveLength(0);
    expect(ctx.state.memberships).toHaveLength(0);
  });

  it("creates the community and an OWNER membership for the Discord owner", async () => {
    const result = await selectCommunity("user_1", G_OWNED);
    expect(result.status).toBe("ok");
    expect(ctx.state.communities).toHaveLength(1);
    expect(ctx.state.communities[0]).toMatchObject({
      discordGuildId: G_OWNED,
      name: "Guild 01",
      ownerId: "user_1",
      botConnectedAt: null,
    });
    expect(ctx.state.memberships).toHaveLength(1);
    expect(ctx.state.memberships[0]).toMatchObject({
      userId: "user_1",
      role: "OWNER",
    });
    expect(ctx.state.memberships[0]?.lastVerifiedAt).toBeInstanceOf(Date);
    if (result.status === "ok") {
      expect(result.communityId).toBe(ctx.state.communities[0]?.id);
    }
  });

  it("creates an ADMIN membership without claiming ownership for an administrator", async () => {
    await selectCommunity("user_1", G_ADMIN);
    expect(ctx.state.communities[0]?.ownerId).toBeNull();
    expect(ctx.state.memberships[0]?.role).toBe("ADMIN");
  });

  it("is idempotent: selecting twice creates no duplicates", async () => {
    const first = await selectCommunity("user_1", G_OWNED);
    const second = await selectCommunity("user_1", G_OWNED);
    expect(second).toEqual(first);
    expect(ctx.state.communities).toHaveLength(1);
    expect(ctx.state.memberships).toHaveLength(1);
  });

  it("refreshes the community name and icon on re-selection", async () => {
    await selectCommunity("user_1", G_OWNED);
    guildsMock.get.mockResolvedValue({
      status: "ok",
      guilds: [{ ...guild(G_OWNED, "owner"), name: "Renamed", iconUrl: "u" }],
    });
    await selectCommunity("user_1", G_OWNED);
    expect(ctx.state.communities[0]).toMatchObject({
      name: "Renamed",
      iconUrl: "u",
    });
  });

  it("never touches other users' memberships", async () => {
    const result = await selectCommunity("user_1", G_ADMIN);
    if (result.status !== "ok") throw new Error("expected ok");
    const other = {
      id: "mem_other",
      userId: "user_2",
      communityId: result.communityId,
      role: "MODERATOR" as const,
      joinedAt: new Date(0),
      lastVerifiedAt: null,
    };
    ctx.state.memberships.push(other);

    await selectCommunity("user_1", G_ADMIN);
    expect(ctx.state.memberships).toHaveLength(2);
    expect(ctx.state.memberships.find((m) => m.id === "mem_other")).toEqual(
      other,
    );
  });

  it("keeps an existing non-owner role (e.g. a promoted moderator-level role)", async () => {
    const first = await selectCommunity("user_1", G_ADMIN);
    if (first.status !== "ok") throw new Error("expected ok");
    ctx.state.memberships[0]!.role = "MODERATOR";
    await selectCommunity("user_1", G_ADMIN);
    expect(ctx.state.memberships[0]?.role).toBe("MODERATOR");
  });

  it("demotes a former owner to ADMIN and does not take over a known owner", async () => {
    await selectCommunity("owner_user", G_OWNED);
    guildsMock.get.mockResolvedValue({
      status: "ok",
      guilds: [guild(G_OWNED, "administrator")],
    });
    await selectCommunity("owner_user", G_OWNED);
    expect(ctx.state.memberships[0]?.role).toBe("ADMIN");
    expect(ctx.state.communities[0]?.ownerId).toBe("owner_user");

    // A new Discord owner claims it only if there is no owner recorded.
    guildsMock.get.mockResolvedValue({
      status: "ok",
      guilds: [guild(G_OWNED, "owner")],
    });
    await selectCommunity("new_owner", G_OWNED);
    expect(ctx.state.communities[0]?.ownerId).toBe("owner_user");
    expect(
      ctx.state.memberships.find((m) => m.userId === "new_owner")?.role,
    ).toBe("OWNER");
  });

  it("claims ownership of a community that had no owner", async () => {
    await selectCommunity("admin_user", G_OWNED); // reason is "owner" in the mock
    ctx.state.communities[0]!.ownerId = null;
    await selectCommunity("user_1", G_OWNED);
    expect(ctx.state.communities[0]?.ownerId).toBe("user_1");
  });

  it("retries once after a unique-constraint race (P2002) and succeeds", async () => {
    let calls = 0;
    ctx.hooks.beforeCommunityUpsert = () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error("dup"), { code: "P2002" });
    };
    const result = await selectCommunity("user_1", G_OWNED);
    expect(result.status).toBe("ok");
    expect(calls).toBe(2);
  });

  it("returns db_error when P2002 happens again on the retry", async () => {
    ctx.hooks.beforeCommunityUpsert = () => {
      throw Object.assign(new Error("dup"), { code: "P2002" });
    };
    expect(await selectCommunity("user_1", G_OWNED)).toEqual({
      status: "db_error",
    });
  });

  it("returns db_error on other database failures without leaking details", async () => {
    ctx.hooks.beforeTransaction = () => {
      throw new Error("connection to postgresql://u:p@host refused");
    };
    const result = await selectCommunity("user_1", G_OWNED);
    expect(result).toEqual({ status: "db_error" });
    expect(JSON.stringify(result)).not.toContain("postgresql");
  });

  it("passes Discord-side failures through", async () => {
    guildsMock.get.mockResolvedValue({ status: "reauth_required" });
    expect(await selectCommunity("user_1", G_OWNED)).toEqual({
      status: "reauth_required",
    });
    guildsMock.get.mockResolvedValue({ status: "rate_limited", retryAfter: 9 });
    expect(await selectCommunity("user_1", G_OWNED)).toEqual({
      status: "rate_limited",
      retryAfter: 9,
    });
    guildsMock.get.mockResolvedValue({ status: "unavailable" });
    expect(await selectCommunity("user_1", G_OWNED)).toEqual({
      status: "unavailable",
    });
    expect(ctx.state.communities).toHaveLength(0);
  });
});
