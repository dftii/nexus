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
