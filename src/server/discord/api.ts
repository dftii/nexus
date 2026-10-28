import "server-only";

import { z } from "zod";

export const DISCORD_API_BASE = "https://discord.com/api/v10";

const DEFAULT_TIMEOUT_MS = 8000;
/** Longest Retry-After (seconds) we are willing to wait inline. */
const MAX_INLINE_RETRY_SECONDS = 2;

/** A Discord snowflake id: a decimal string of 17-20 digits. */
export const snowflakeSchema = z.string().regex(/^\d{17,20}$/);

const guildSchema = z.object({
  id: snowflakeSchema,
  name: z.string(),
  icon: z.string().nullable(),
  owner: z.boolean(),
  permissions: z.string(),
});

// Extra fields (features, banner, ...) are ignored on purpose.
const guildsSchema = z.array(guildSchema);

export type DiscordGuild = z.infer<typeof guildSchema>;

export type DiscordApiError =
  | { kind: "unauthorized" }
  | { kind: "rate_limited"; retryAfter: number }
  | { kind: "unavailable" }
  | { kind: "invalid_response" };

export type FetchGuildsResult =
  { ok: true; guilds: DiscordGuild[] } | ({ ok: false } & DiscordApiError);

export interface FetchGuildsOptions {
  /** Injected in tests. */
  fetch?: typeof fetch;
  timeoutMs?: number;
  /** Injected in tests so retries do not really wait. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Seconds to wait from a 429 response; body `retry_after` wins over the header. */
async function readRetryAfter(response: Response): Promise<number> {
  let seconds: number | undefined;
  try {
    const body: unknown = await response.json();
    const parsed = z.object({ retry_after: z.number() }).safeParse(body);
    if (parsed.success) seconds = parsed.data.retry_after;
  } catch {
    // Body is not JSON; fall back to the header.
  }
  if (seconds === undefined) {
    const raw = response.headers.get("retry-after");
    const header = raw === null || raw.trim() === "" ? NaN : Number(raw);
    if (Number.isFinite(header) && header >= 0) seconds = header;
  }
  // Unknown value: assume a long wait so we never hammer the API.
  return seconds ?? 60;
}

type AttemptResult =
  | { done: true; result: FetchGuildsResult }
  | { done: false; retryAfter: number };

async function attempt(
  accessToken: string,
  doFetch: typeof fetch,
  timeoutMs: number,
): Promise<AttemptResult> {
  let response: Response;
  try {
    response = await doFetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch {
    // Network failure or timeout. The error object is dropped on purpose.
    return { done: true, result: { ok: false, kind: "unavailable" } };
  }

  if (response.status === 401 || response.status === 403) {
    return { done: true, result: { ok: false, kind: "unauthorized" } };
  }
  if (response.status === 429) {
    return { done: false, retryAfter: await readRetryAfter(response) };
  }
  if (!response.ok) {
    return { done: true, result: { ok: false, kind: "unavailable" } };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { done: true, result: { ok: false, kind: "invalid_response" } };
  }
  const parsed = guildsSchema.safeParse(body);
  if (!parsed.success) {
    return { done: true, result: { ok: false, kind: "invalid_response" } };
  }
  return { done: true, result: { ok: true, guilds: parsed.data } };
}

/**
 * List the guilds the token's user belongs to (`guilds` scope). Never throws:
 * every failure is a typed result. The access token is only ever put in the
 * Authorization header; it is not logged and not part of any returned error.
 */
export async function fetchCurrentUserGuilds(
  accessToken: string,
  options: FetchGuildsOptions = {},
): Promise<FetchGuildsResult> {
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const sleep = options.sleep ?? defaultSleep;

  const first = await attempt(accessToken, doFetch, timeoutMs);
  if (first.done) return first.result;

  if (first.retryAfter > MAX_INLINE_RETRY_SECONDS) {
    return { ok: false, kind: "rate_limited", retryAfter: first.retryAfter };
  }
  await sleep(Math.ceil(first.retryAfter * 1000));
  const second = await attempt(accessToken, doFetch, timeoutMs);
  if (second.done) return second.result;
  return { ok: false, kind: "rate_limited", retryAfter: second.retryAfter };
}
