import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "../../helpers/fake-db";

const fake = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/server/db", () => ({ getDb: () => fake.current }));

import { buildAuthConfig, DISCORD_SCOPES } from "@/server/auth/config";
import { mapDiscordProfile } from "@/server/auth/profile";
import { toPublicSession } from "@/server/auth/session";
import { syncDiscordSignIn } from "@/server/auth/sync";

let ctx: ReturnType<typeof createFakeDb>;

beforeEach(() => {
  ctx = createFakeDb();
  fake.current = ctx.db;
  vi.stubEnv("AUTH_DISCORD_ID", "client-id");
  vi.stubEnv("AUTH_DISCORD_SECRET", "client-secret");
});

describe("auth config", () => {
  it("uses database sessions and the custom pages", () => {
    const config = buildAuthConfig();
    expect(config.session?.strategy).toBe("database");
    expect(config.pages).toEqual({ signIn: "/login", error: "/login" });
    expect(config.adapter).toBeDefined();
  });

  it("requests exactly the identify and guilds scopes (no email)", () => {
    expect(DISCORD_SCOPES).toBe("identify guilds");
    const [provider] = buildAuthConfig().providers as Array<{
      id?: string;
      options?: { authorization?: { params?: { scope?: string } } };
    }>;
    expect(provider?.id).toBe("discord");
    expect(provider?.options?.authorization?.params?.scope).toBe(
      "identify guilds",
    );
    expect(provider?.options?.authorization?.params?.scope).not.toMatch(
      /email/,
    );
  });

  it("only sets up the Discord provider", () => {
    expect(buildAuthConfig().providers).toHaveLength(1);
  });

  it("logs error types only, never the error object or its cause", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("boom access_token=SECRET"), {
      type: "OAuthCallbackError",
      cause: { body: "refresh_token=SECRET" },
    });
    buildAuthConfig().logger?.error?.(error as never);
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain("OAuthCallbackError");
    expect(logged).not.toContain("SECRET");
    spy.mockRestore();
  });
});

describe("session callback", () => {
  const dbUser = {
    id: "user_1",
    discordId: "123456789012345678",
    username: "alex",
    displayName: "Alex",
    avatarUrl: "https://cdn.discordapp.com/avatars/1/a.png",
    name: "Alex",
    image: "https://cdn.discordapp.com/avatars/1/a.png",
    email: null,
    emailVerified: null,
  };

  it("returns only id, name, image and expires", () => {
    const session = toPublicSession(dbUser, new Date("2026-11-27T00:00:00Z"));
    expect(session).toEqual({
      user: {
        id: "user_1",
        name: "Alex",
        image: "https://cdn.discordapp.com/avatars/1/a.png",
      },
      expires: "2026-11-27T00:00:00.000Z",
    });
  });

  it("never leaks tokens or the session token, even if the inputs carry them", async () => {
    const secrets = [
      "ACCESS-TOKEN-VALUE",
      "REFRESH-TOKEN-VALUE",
      "SESSION-TOKEN-VALUE",
      "ID-TOKEN-VALUE",
    ];
    const hostile = {
      ...dbUser,
      access_token: secrets[0],
      refresh_token: secrets[1],
      id_token: secrets[3],
      accounts: [{ access_token: secrets[0], refresh_token: secrets[1] }],
    };
    const config = buildAuthConfig();
    const result = await config.callbacks!.session!({
      session: {
        user: hostile,
        sessionToken: secrets[2],
        userId: "user_1",
        expires: new Date("2026-11-27T00:00:00Z"),
      },
      user: hostile,
    } as never);

    const serialized = JSON.stringify(result);
    for (const secret of secrets) expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("123456789012345678"); // discordId
    expect(Object.keys((result as { user: object }).user).sort()).toEqual([
      "id",
      "image",
      "name",
    ]);
    expect(Object.keys(result as object).sort()).toEqual(["expires", "user"]);
  });

  it("falls back from name to display name to username", () => {
    expect(
      toPublicSession({ id: "u", displayName: "D", username: "n" }, "x").user
        .name,
    ).toBe("D");
    expect(toPublicSession({ id: "u", username: "n" }, "x").user.name).toBe(
      "n",
    );
    expect(toPublicSession({ id: "u" }, "x").user).toEqual({
      id: "u",
      name: null,
      image: null,
    });
  });
});

describe("mapDiscordProfile", () => {
  it("maps to columns the User model has, with email null", () => {
    const mapped = mapDiscordProfile({
      id: "123456789012345678",
      username: "alex",
      global_name: "Alex G",
      avatar: "abcdef",
      discriminator: "0",
      email: "secret@example.com",
    });
    expect(mapped).toEqual({
      id: "123456789012345678",
      discordId: "123456789012345678",
      username: "alex",
      displayName: "Alex G",
      avatarUrl:
        "https://cdn.discordapp.com/avatars/123456789012345678/abcdef.png?size=128",
      name: "Alex G",
      image:
        "https://cdn.discordapp.com/avatars/123456789012345678/abcdef.png?size=128",
      email: null,
    });
  });

  it("uses the username and a default avatar when there is no global name or avatar", () => {
    const mapped = mapDiscordProfile({
      id: "123456789012345678",
      username: "alex",
      global_name: null,
      avatar: null,
    });
    expect(mapped.displayName).toBeNull();
    expect(mapped.name).toBe("alex");
    expect(mapped.avatarUrl).toMatch(
      /^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/[0-5]\.png$/,
    );
  });

  it("rejects malformed profiles", () => {
    expect(() => mapDiscordProfile({ id: "x", username: "a" })).toThrow();
    expect(() => mapDiscordProfile({})).toThrow();
    expect(() => mapDiscordProfile(null)).toThrow();
  });
});

describe("syncDiscordSignIn", () => {
  const profile = {
    id: "123456789012345678",
    username: "alex_new",
    global_name: "Alex New",
    avatar: null,
  };

  function seed() {
    ctx.state.users.push({ id: "user_1", username: "alex_old" });
    ctx.state.accounts.push({
      id: "acc_1",
      userId: "user_1",
      provider: "discord",
      providerAccountId: "123456789012345678",
      access_token: "old_a",
      refresh_token: "old_r",
      expires_at: 1,
      scope: "identify guilds",
      token_type: "Bearer",
    });
  }

  it("refreshes the stored tokens and profile on every sign-in", async () => {
    seed();
    await syncDiscordSignIn({
      user: { id: "user_1" },
      account: {
        provider: "discord",
        providerAccountId: "123456789012345678",
        access_token: "new_a",
        refresh_token: "new_r",
        expires_at: 999,
        scope: "identify guilds",
        token_type: "bearer",
      },
      profile,
    });
    expect(ctx.state.accounts[0]).toMatchObject({
      access_token: "new_a",
      refresh_token: "new_r",
      expires_at: 999,
    });
    expect(ctx.state.users[0]).toMatchObject({
      username: "alex_new",
      displayName: "Alex New",
      name: "Alex New",
    });
  });

  it("keeps the old refresh token when Discord sends none", async () => {
    seed();
    await syncDiscordSignIn({
      user: { id: "user_1" },
      account: {
        provider: "discord",
        providerAccountId: "123456789012345678",
        access_token: "new_a",
      },
      profile,
    });
    expect(ctx.state.accounts[0]).toMatchObject({
      access_token: "new_a",
      refresh_token: "old_r",
    });
  });

  it("ignores other providers and never throws", async () => {
    seed();
    await syncDiscordSignIn({
      user: { id: "user_1" },
      account: { provider: "github", providerAccountId: "1" },
      profile,
    });
    expect(ctx.state.accounts[0]?.access_token).toBe("old_a");

    ctx.hooks.beforeAccountCall = () => {
      throw new Error("db down");
    };
    await expect(
      syncDiscordSignIn({
        user: { id: "user_1" },
        account: {
          provider: "discord",
          providerAccountId: "123456789012345678",
          access_token: "x",
        },
        profile,
      }),
    ).resolves.toBeUndefined();
    await expect(
      syncDiscordSignIn({
        user: { id: "user_1" },
        account: { provider: "discord", providerAccountId: "1" },
        profile: { malformed: true },
      }),
    ).resolves.toBeUndefined();
  });
});
