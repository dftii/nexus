import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "../../helpers/fake-db";

const fake = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/server/db", () => ({ getDb: () => fake.current }));

import { getValidDiscordAccessToken } from "@/server/discord/tokens";

const NOW_MS = Date.UTC(2026, 9, 28, 12, 0, 0);
const NOW_S = Math.floor(NOW_MS / 1000);
const now = () => NOW_MS;

let ctx: ReturnType<typeof createFakeDb>;

function addAccount(
  overrides: Partial<(typeof ctx.state.accounts)[number]> = {},
) {
  ctx.state.accounts.push({
    id: "acc_1",
    userId: "user_1",
    provider: "discord",
    providerAccountId: "123456789012345678",
    access_token: "old_access",
    refresh_token: "old_refresh",
    expires_at: NOW_S + 3600,
    scope: "identify guilds",
    token_type: "Bearer",
    ...overrides,
  });
}

function refreshResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  ctx = createFakeDb();
  fake.current = ctx.db;
  vi.stubEnv("AUTH_DISCORD_ID", "client-id");
  vi.stubEnv("AUTH_DISCORD_SECRET", "client-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getValidDiscordAccessToken", () => {
  it("returns the stored token without calling Discord when it is still valid", async () => {
    addAccount();
    const fetchMock = vi.fn();
    const result = await getValidDiscordAccessToken("user_1", {
      fetch: fetchMock as unknown as typeof fetch,
      now,
    });
    expect(result).toEqual({ ok: true, accessToken: "old_access" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes an expired token and persists the rotated tokens in one update", async () => {
    addAccount({ expires_at: NOW_S - 10 });
    const updateSpy = vi.spyOn(ctx.db.account, "update");
    const fetchMock = vi.fn(async () =>
      refreshResponse({
        access_token: "new_access",
        refresh_token: "new_refresh",
        expires_in: 604800,
        scope: "identify guilds",
        token_type: "Bearer",
      }),
    );

    const result = await getValidDiscordAccessToken("user_1", {
      fetch: fetchMock as unknown as typeof fetch,
      now,
    });

    expect(result).toEqual({ ok: true, accessToken: "new_access" });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(ctx.state.accounts[0]).toMatchObject({
      access_token: "new_access",
      refresh_token: "new_refresh",
      expires_at: NOW_S + 604800,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { method: string; body: URLSearchParams },
    ];
    expect(url).toBe("https://discord.com/api/v10/oauth2/token");
    expect(init.method).toBe("POST");
    expect(init.body.get("grant_type")).toBe("refresh_token");
    expect(init.body.get("refresh_token")).toBe("old_refresh");
    expect(init.body.get("client_id")).toBe("client-id");
  });

  it("refreshes when the token expires within the 60 second skew", async () => {
    addAccount({ expires_at: NOW_S + 30 });
    const fetchMock = vi.fn(async () =>
      refreshResponse({
        access_token: "new_access",
        refresh_token: "new_refresh",
        expires_in: 100,
      }),
    );
    const result = await getValidDiscordAccessToken("user_1", {
      fetch: fetchMock as unknown as typeof fetch,
      now,
    });
    expect(result).toEqual({ ok: true, accessToken: "new_access" });
  });

  it("asks for re-authentication when there is no Discord account", async () => {
    const result = await getValidDiscordAccessToken("user_1", { now });
    expect(result).toEqual({ ok: false, reason: "reauth_required" });
  });

  it("asks for re-authentication when the token is expired and has no refresh token", async () => {
    addAccount({ expires_at: NOW_S - 10, refresh_token: null });
    const result = await getValidDiscordAccessToken("user_1", { now });
    expect(result).toEqual({ ok: false, reason: "reauth_required" });
  });

  it("asks for re-authentication when the guilds scope was not granted", async () => {
    addAccount({ scope: "identify" });
    const result = await getValidDiscordAccessToken("user_1", { now });
    expect(result).toEqual({ ok: false, reason: "reauth_required" });
  });

  it("maps invalid_grant to reauth_required and keeps the row untouched", async () => {
    addAccount({ expires_at: NOW_S - 10 });
    const fetchMock = vi.fn(async () =>
      refreshResponse({ error: "invalid_grant" }, 400),
    );
    const result = await getValidDiscordAccessToken("user_1", {
      fetch: fetchMock as unknown as typeof fetch,
      now,
    });
    expect(result).toEqual({ ok: false, reason: "reauth_required" });
    expect(ctx.state.accounts[0]?.refresh_token).toBe("old_refresh");
  });

  it("maps a 401 from the token endpoint to reauth_required", async () => {
    addAccount({ expires_at: NOW_S - 10 });
    const result = await getValidDiscordAccessToken("user_1", {
      fetch: vi.fn(async () =>
        refreshResponse({}, 401),
      ) as unknown as typeof fetch,
      now,
    });
    expect(result).toEqual({ ok: false, reason: "reauth_required" });
  });

  it("uses a token a concurrent request already refreshed instead of failing", async () => {
    addAccount({ expires_at: NOW_S - 10 });
    const fetchMock = vi.fn(async () => {
      // The winner of the race stores its rotated tokens before we re-read.
      Object.assign(ctx.state.accounts[0]!, {
        access_token: "winner_access",
        refresh_token: "winner_refresh",
        expires_at: NOW_S + 3600,
      });
      return refreshResponse({ error: "invalid_grant" }, 400);
    });
    const result = await getValidDiscordAccessToken("user_1", {
      fetch: fetchMock as unknown as typeof fetch,
      now,
    });
    expect(result).toEqual({ ok: true, accessToken: "winner_access" });
  });

  it("reports unavailable (not reauth) on a network failure and keeps the old tokens", async () => {
    addAccount({ expires_at: NOW_S - 10 });
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed: old_refresh client-secret");
    });
    const result = await getValidDiscordAccessToken("user_1", {
      fetch: fetchMock as unknown as typeof fetch,
      now,
    });
    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("old_refresh");
    expect(ctx.state.accounts[0]?.refresh_token).toBe("old_refresh");
  });

  it("reports unavailable on 5xx and on a malformed refresh response", async () => {
    for (const response of [
      refreshResponse({}, 503),
      refreshResponse({ access_token: "x" }, 200),
      new Response("not json", { status: 200 }),
    ]) {
      ctx.state.accounts.length = 0;
      addAccount({ expires_at: NOW_S - 10 });
      const result = await getValidDiscordAccessToken("user_1", {
        fetch: vi.fn(async () => response) as unknown as typeof fetch,
        now,
      });
      expect(result).toEqual({ ok: false, reason: "unavailable" });
    }
  });

  it("reports unavailable when the client credentials are not configured", async () => {
    vi.stubEnv("AUTH_DISCORD_ID", "");
    addAccount({ expires_at: NOW_S - 10 });
    const fetchMock = vi.fn();
    const result = await getValidDiscordAccessToken("user_1", {
      fetch: fetchMock as unknown as typeof fetch,
      now,
    });
    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only reads the requested user's account", async () => {
    addAccount({ userId: "someone_else", access_token: "their_token" });
    const result = await getValidDiscordAccessToken("user_1", { now });
    expect(result).toEqual({ ok: false, reason: "reauth_required" });
  });
});
