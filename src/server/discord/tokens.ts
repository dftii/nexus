import "server-only";

import { z } from "zod";
import { getAuthEnv } from "@/lib/env";
import { getDb } from "@/server/db";
import { DISCORD_API_BASE } from "./api";

/** Refresh a little early so a token never expires mid-request. */
const EXPIRY_SKEW_SECONDS = 60;
const REFRESH_TIMEOUT_MS = 8000;

export type DiscordTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: "reauth_required" | "unavailable" };

const refreshResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().positive(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

export interface TokenOptions {
  /** Injected in tests. */
  fetch?: typeof fetch;
  /** Injected in tests. Defaults to `Date.now`. */
  now?: () => number;
}

interface StoredAccount {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
}

const accountSelect = {
  id: true,
  access_token: true,
  refresh_token: true,
  expires_at: true,
  scope: true,
} as const;

function isExpired(account: StoredAccount, nowMs: number): boolean {
  if (account.expires_at === null) return false;
  return account.expires_at - EXPIRY_SKEW_SECONDS <= Math.floor(nowMs / 1000);
}

function hasGuildsScope(account: StoredAccount): boolean {
  // A missing scope string is tolerated (older rows); a present one must list it.
  return (
    account.scope === null || account.scope.split(/[\s,]+/).includes("guilds")
  );
}

type RefreshOutcome =
  | { kind: "ok"; data: z.infer<typeof refreshResponseSchema> }
  | { kind: "invalid_grant" }
  | { kind: "unavailable" };

async function requestRefresh(
  refreshToken: string,
  doFetch: typeof fetch,
): Promise<RefreshOutcome> {
  const { AUTH_DISCORD_ID, AUTH_DISCORD_SECRET } = getAuthEnv();
  if (!AUTH_DISCORD_ID || !AUTH_DISCORD_SECRET) {
    return { kind: "unavailable" };
  }
  let response: Response;
  try {
    response = await doFetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: AUTH_DISCORD_ID,
        client_secret: AUTH_DISCORD_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.status === 401) return { kind: "invalid_grant" };
  if (response.status === 400) {
    // Discord answers a revoked/rotated refresh token with 400 invalid_grant.
    try {
      const body: unknown = await response.json();
      const parsed = z.object({ error: z.string() }).safeParse(body);
      if (parsed.success && parsed.data.error === "invalid_grant") {
        return { kind: "invalid_grant" };
      }
    } catch {
      // fall through
    }
    return { kind: "unavailable" };
  }
  if (!response.ok) return { kind: "unavailable" };

  try {
    const parsed = refreshResponseSchema.safeParse(await response.json());
    return parsed.success
      ? { kind: "ok", data: parsed.data }
      : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

/**
 * A usable Discord access token for the user, refreshing it when it is about to
 * expire. Server-only: the token goes to the calling server code and nowhere
 * else (never logged, never put in a session or a response).
 *
 * Discord rotates refresh tokens, so concurrent refreshes can race: the loser
 * gets `invalid_grant` for a token the winner already replaced. On
 * `invalid_grant` the row is re-read and, if another request already stored a
 * fresh token, that one is used instead of forcing a new sign-in.
 */
export async function getValidDiscordAccessToken(
  userId: string,
  options: TokenOptions = {},
): Promise<DiscordTokenResult> {
  const doFetch = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const db = getDb();

  const account = await db.account.findFirst({
    where: { userId, provider: "discord" },
    select: accountSelect,
  });
  if (!account || !hasGuildsScope(account)) {
    return { ok: false, reason: "reauth_required" };
  }

  if (account.access_token && !isExpired(account, now())) {
    return { ok: true, accessToken: account.access_token };
  }
  if (!account.refresh_token) {
    return { ok: false, reason: "reauth_required" };
  }

  const outcome = await requestRefresh(account.refresh_token, doFetch);

  if (outcome.kind === "ok") {
    const { data } = outcome;
    await db.account.update({
      where: { id: account.id },
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(now() / 1000) + Math.floor(data.expires_in),
        ...(data.scope ? { scope: data.scope } : {}),
        ...(data.token_type ? { token_type: data.token_type } : {}),
      },
    });
    return { ok: true, accessToken: data.access_token };
  }

  if (outcome.kind === "invalid_grant") {
    const latest = await db.account.findFirst({
      where: { id: account.id },
      select: accountSelect,
    });
    if (
      latest?.access_token &&
      latest.refresh_token !== account.refresh_token &&
      !isExpired(latest, now())
    ) {
      return { ok: true, accessToken: latest.access_token };
    }
    return { ok: false, reason: "reauth_required" };
  }

  return { ok: false, reason: "unavailable" };
}
