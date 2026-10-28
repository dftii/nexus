import { z } from "zod";

/**
 * Server environment, validated with Zod.
 *
 * Validation is LAZY on purpose: nothing here runs at import time, so
 * `next build` works without DATABASE_URL and pages that do not touch the
 * database never fail because of it. Call `getEnv()` where a value is needed
 * (the DB client does).
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      error: "DATABASE_URL must be a postgresql:// connection string",
    }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validate an env-like object. Throws an Error that lists the invalid
 * variable NAMES only; values are never included (they may be secrets).
 */
export function parseEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables - ${issues}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** Validated server env, parsed once from `process.env` on first call. */
export function getEnv(): ServerEnv {
  cached ??= parseEnv(process.env);
  return cached;
}

/** Test helper: forget the memoised value. */
export function resetEnvCache() {
  cached = undefined;
}

/**
 * Authentication environment (Auth.js v5 names). Kept apart from `getEnv()` on
 * purpose: auth variables are optional, so the app builds, serves its public
 * pages and runs its tests without them. When they are missing, sign-in is
 * reported as "not configured" instead of crashing.
 *
 * `AUTH_URL` / `AUTH_TRUST_HOST` are read by Auth.js itself (see
 * node_modules/@auth/core), not here.
 */
const authEnvSchema = z.object({
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_DISCORD_ID: z.string().min(1).optional(),
  AUTH_DISCORD_SECRET: z.string().min(1).optional(),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

/** Auth variables with empty strings treated as unset. Never throws. */
export function getAuthEnv(
  source: Record<string, string | undefined> = process.env,
): AuthEnv {
  const clean = (value: string | undefined) =>
    value && value.trim() !== "" ? value : undefined;
  return authEnvSchema.parse({
    AUTH_SECRET: clean(source.AUTH_SECRET),
    AUTH_DISCORD_ID: clean(source.AUTH_DISCORD_ID),
    AUTH_DISCORD_SECRET: clean(source.AUTH_DISCORD_SECRET),
  });
}

/** True when sign-in can work: the secret and both Discord credentials are set. */
export function isAuthConfigured(
  source: Record<string, string | undefined> = process.env,
): boolean {
  const env = getAuthEnv(source);
  return Boolean(
    env.AUTH_SECRET && env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET,
  );
}
