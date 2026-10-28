import { describe, expect, it, vi } from "vitest";
import {
  fetchCurrentUserGuilds,
  type FetchGuildsResult,
} from "@/server/discord/api";

const TOKEN = "tok_SECRET_value_123";

const guild = {
  id: "123456789012345678",
  name: "Test Server",
  icon: null,
  owner: true,
  permissions: "2147483647",
};

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function mockFetch(...responses: Array<Response | Error>) {
  const queue = [...responses];
  return vi.fn(async () => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra fetch");
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const noSleep = async () => {};

function expectNoToken(result: FetchGuildsResult) {
  expect(JSON.stringify(result)).not.toContain(TOKEN);
}

describe("fetchCurrentUserGuilds", () => {
  it("returns validated guilds and sends the bearer token", async () => {
    const fetchMock = mockFetch(
      json([{ ...guild, features: ["COMMUNITY"], banner: null, extra: 1 }]),
    );
    const result = await fetchCurrentUserGuilds(TOKEN, { fetch: fetchMock });
    expect(result).toEqual({ ok: true, guilds: [guild] });
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe("https://discord.com/api/v10/users/@me/guilds");
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects entries that do not match the schema", async () => {
    for (const body of [
      [{ ...guild, id: "not-a-snowflake" }],
      [{ ...guild, permissions: 8 }],
      [{ ...guild, owner: "yes" }],
      [{ name: "no id" }],
      { not: "an array" },
    ]) {
      const result = await fetchCurrentUserGuilds(TOKEN, {
        fetch: mockFetch(json(body)),
      });
      expect(result).toEqual({ ok: false, kind: "invalid_response" });
    }
  });

  it("reports invalid_response for a non-JSON body", async () => {
    const result = await fetchCurrentUserGuilds(TOKEN, {
      fetch: mockFetch(new Response("<html>", { status: 200 })),
    });
    expect(result).toEqual({ ok: false, kind: "invalid_response" });
  });

  it("maps 401 to unauthorized", async () => {
    const result = await fetchCurrentUserGuilds(TOKEN, {
      fetch: mockFetch(json({ message: "401: Unauthorized" }, { status: 401 })),
    });
    expect(result).toEqual({ ok: false, kind: "unauthorized" });
  });

  it("retries once on a short 429 and then succeeds", async () => {
    const fetchMock = mockFetch(
      json({ retry_after: 0.5 }, { status: 429 }),
      json([guild]),
    );
    const sleep = vi.fn(noSleep);
    const result = await fetchCurrentUserGuilds(TOKEN, {
      fetch: fetchMock,
      sleep,
    });
    expect(result).toEqual({ ok: true, guilds: [guild] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it("reads Retry-After from the header when the body has none", async () => {
    const fetchMock = mockFetch(
      new Response("", { status: 429, headers: { "Retry-After": "1" } }),
      json([guild]),
    );
    const sleep = vi.fn(noSleep);
    const result = await fetchCurrentUserGuilds(TOKEN, {
      fetch: fetchMock,
      sleep,
    });
    expect(result.ok).toBe(true);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("does not wait when the rate limit is longer than 2 seconds", async () => {
    const fetchMock = mockFetch(json({ retry_after: 30 }, { status: 429 }));
    const sleep = vi.fn(noSleep);
    const result = await fetchCurrentUserGuilds(TOKEN, {
      fetch: fetchMock,
      sleep,
    });
    expect(result).toEqual({ ok: false, kind: "rate_limited", retryAfter: 30 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("gives up after a second 429", async () => {
    const fetchMock = mockFetch(
      json({ retry_after: 1 }, { status: 429 }),
      json({ retry_after: 1 }, { status: 429 }),
    );
    const result = await fetchCurrentUserGuilds(TOKEN, {
      fetch: fetchMock,
      sleep: noSleep,
    });
    expect(result).toEqual({ ok: false, kind: "rate_limited", retryAfter: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("assumes a long wait when a 429 gives no retry hint", async () => {
    const result = await fetchCurrentUserGuilds(TOKEN, {
      fetch: mockFetch(new Response("", { status: 429 })),
    });
    expect(result).toEqual({ ok: false, kind: "rate_limited", retryAfter: 60 });
  });

  it("maps 5xx to unavailable", async () => {
    for (const status of [500, 502, 503]) {
      const result = await fetchCurrentUserGuilds(TOKEN, {
        fetch: mockFetch(new Response("boom", { status })),
      });
      expect(result).toEqual({ ok: false, kind: "unavailable" });
    }
  });

  it("maps network errors and timeouts to unavailable without leaking the token", async () => {
    const network = await fetchCurrentUserGuilds(TOKEN, {
      fetch: mockFetch(new TypeError(`fetch failed for Bearer ${TOKEN}`)),
    });
    expect(network).toEqual({ ok: false, kind: "unavailable" });
    expectNoToken(network);

    const timeout = await fetchCurrentUserGuilds(TOKEN, {
      fetch: mockFetch(new DOMException("timed out", "TimeoutError")),
    });
    expect(timeout).toEqual({ ok: false, kind: "unavailable" });
  });

  it("never puts the token in any result", async () => {
    const results = await Promise.all([
      fetchCurrentUserGuilds(TOKEN, { fetch: mockFetch(json([guild])) }),
      fetchCurrentUserGuilds(TOKEN, {
        fetch: mockFetch(json({}, { status: 401 })),
      }),
      fetchCurrentUserGuilds(TOKEN, {
        fetch: mockFetch(new Response(TOKEN, { status: 500 })),
      }),
      fetchCurrentUserGuilds(TOKEN, {
        fetch: mockFetch(json({ x: TOKEN })),
      }),
    ]);
    for (const result of results) expectNoToken(result);
  });
});
