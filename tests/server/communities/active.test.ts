import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "../../helpers/fake-db";

const fake = vi.hoisted(() => ({ current: undefined as unknown }));
const store = vi.hoisted(() => ({
  value: undefined as string | undefined,
  set: vi.fn(),
  deleted: vi.fn(),
}));

vi.mock("@/server/db", () => ({ getDb: () => fake.current }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "nexus_community" && store.value !== undefined
        ? { name, value: store.value }
        : undefined,
    set: store.set,
    delete: store.deleted,
  }),
}));

import {
  ACTIVE_COMMUNITY_COOKIE,
  clearActiveCommunityCookie,
  getActiveCommunity,
  setActiveCommunityCookie,
} from "@/server/communities/active";
import {
  getUserCommunity,
  listUserCommunities,
} from "@/server/communities/queries";

let ctx: ReturnType<typeof createFakeDb>;

function seed() {
  ctx.state.communities.push(
    {
      id: "com_a",
      discordGuildId: "1",
      name: "A",
      iconUrl: null,
      ownerId: null,
      botConnectedAt: null,
    },
    {
      id: "com_b",
      discordGuildId: "2",
      name: "B",
      iconUrl: null,
      ownerId: null,
      botConnectedAt: new Date(),
    },
    {
      id: "com_foreign",
      discordGuildId: "3",
      name: "Foreign",
      iconUrl: null,
      ownerId: null,
      botConnectedAt: null,
    },
  );
  ctx.state.memberships.push(
    {
      id: "m1",
      userId: "user_1",
      communityId: "com_a",
      role: "OWNER",
      joinedAt: new Date(1000),
      lastVerifiedAt: null,
    },
    {
      id: "m2",
      userId: "user_1",
      communityId: "com_b",
      role: "ADMIN",
      joinedAt: new Date(2000),
      lastVerifiedAt: null,
    },
    {
      id: "m3",
      userId: "user_2",
      communityId: "com_foreign",
      role: "OWNER",
      joinedAt: new Date(3000),
      lastVerifiedAt: null,
    },
  );
}

beforeEach(() => {
  ctx = createFakeDb();
  fake.current = ctx.db;
  store.value = undefined;
  store.set.mockReset();
  store.deleted.mockReset();
  seed();
});

describe("tenant-isolated reads", () => {
  it("lists only the user's communities, most recently joined first", async () => {
    const list = await listUserCommunities("user_1");
    expect(list.map((c) => c.id)).toEqual(["com_b", "com_a"]);
    expect(list[0]).toMatchObject({ role: "ADMIN", botConnected: true });
    expect(list[1]).toMatchObject({ role: "OWNER", botConnected: false });
  });

  it("returns a community only when the user has a membership", async () => {
    expect((await getUserCommunity("user_1", "com_a"))?.name).toBe("A");
    expect(await getUserCommunity("user_1", "com_foreign")).toBeNull();
    expect(await getUserCommunity("user_1", "does_not_exist")).toBeNull();
    expect(await getUserCommunity("nobody", "com_a")).toBeNull();
  });
});

describe("getActiveCommunity", () => {
  it("uses the cookie when the user is a member of that community", async () => {
    store.value = "com_a";
    expect((await getActiveCommunity("user_1"))?.id).toBe("com_a");
  });

  it("ignores a cookie for a community the user does not belong to", async () => {
    store.value = "com_foreign";
    const active = await getActiveCommunity("user_1");
    expect(active?.id).toBe("com_b");
    expect(active?.id).not.toBe("com_foreign");
  });

  it("ignores garbage and oversized cookie values", async () => {
    store.value = "x".repeat(500);
    expect((await getActiveCommunity("user_1"))?.id).toBe("com_b");
    store.value = "'; DROP TABLE communities; --";
    expect((await getActiveCommunity("user_1"))?.id).toBe("com_b");
  });

  it("falls back to the most recent membership without a cookie", async () => {
    expect((await getActiveCommunity("user_1"))?.id).toBe("com_b");
  });

  it("returns null for a user with no memberships", async () => {
    store.value = "com_a";
    expect(await getActiveCommunity("user_without")).toBeNull();
  });
});

describe("active community cookie", () => {
  it("is httpOnly, lax, path / and only secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await setActiveCommunityCookie("com_a");
    expect(store.set).toHaveBeenCalledWith(
      ACTIVE_COMMUNITY_COOKIE,
      "com_a",
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      }),
    );
    store.set.mockClear();
    vi.stubEnv("NODE_ENV", "development");
    await setActiveCommunityCookie("com_a");
    expect(store.set.mock.calls[0]?.[2]).toMatchObject({ secure: false });
    vi.unstubAllEnvs();
  });

  it("is named nexus_community and can be cleared", async () => {
    expect(ACTIVE_COMMUNITY_COOKIE).toBe("nexus_community");
    await clearActiveCommunityCookie();
    expect(store.deleted).toHaveBeenCalledWith("nexus_community");
  });
});
