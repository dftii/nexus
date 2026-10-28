import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "../../helpers/fake-db";

const fake = vi.hoisted(() => ({ current: undefined as unknown }));
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  cookieSet: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/server/db", () => ({ getDb: () => fake.current }));
vi.mock("@/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: mocks.cookieSet,
    delete: vi.fn(),
  }),
}));

import { switchActiveCommunityAction } from "@/features/communities/actions";

function community(id: string, guild: string) {
  return {
    id,
    discordGuildId: guild,
    name: id,
    iconUrl: null,
    ownerId: null,
    botConnectedAt: null,
  };
}

function membership(id: string, userId: string, communityId: string) {
  return {
    id,
    userId,
    communityId,
    role: "ADMIN" as const,
    joinedAt: new Date(1000),
    lastVerifiedAt: null,
  };
}

function form(communityId: unknown): FormData {
  const data = new FormData();
  if (communityId !== undefined) data.set("communityId", String(communityId));
  return data;
}

async function run(data: FormData) {
  await expect(switchActiveCommunityAction(data)).rejects.toThrow(
    "NEXT_REDIRECT:/",
  );
}

beforeEach(() => {
  const ctx = createFakeDb();
  fake.current = ctx.db;
  ctx.state.communities.push(
    community("com_a", "1"),
    community("com_b", "2"),
    community("com_foreign", "3"),
  );
  ctx.state.memberships.push(
    membership("m1", "user_1", "com_a"),
    membership("m2", "user_1", "com_b"),
    membership("m3", "user_2", "com_foreign"),
  );
  mocks.requireUser.mockReset().mockResolvedValue({
    id: "user_1",
    name: "Ada",
    image: null,
  });
  mocks.cookieSet.mockReset();
  mocks.redirect.mockClear();
});

describe("switchActiveCommunityAction", () => {
  it("switches to a community the user belongs to", async () => {
    await run(form("com_a"));
    expect(mocks.cookieSet).toHaveBeenCalledTimes(1);
    expect(mocks.cookieSet.mock.calls[0]![0]).toBe("nexus_community");
    expect(mocks.cookieSet.mock.calls[0]![1]).toBe("com_a");
  });

  it("rejects an id that belongs to someone else's community", async () => {
    await run(form("com_foreign"));
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown id", "does_not_exist"],
    ["an empty id", ""],
    ["an oversized id", "x".repeat(500)],
    ["an injection attempt", "'; DROP TABLE communities; --"],
    ["a missing field", undefined],
  ])("changes nothing for %s", async (_label, value) => {
    await run(form(value));
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("takes the user from the session, never from the form", async () => {
    mocks.requireUser.mockResolvedValue({
      id: "user_2",
      name: null,
      image: null,
    });
    const data = form("com_a");
    data.set("userId", "user_1");
    await run(data);
    // user_2 has no membership in com_a, whatever the form claims.
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("requires a session first", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect(switchActiveCommunityAction(form("com_a"))).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});
