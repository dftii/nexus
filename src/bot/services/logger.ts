/**
 * Structured JSON-lines logger (one object per line on stdout).
 *
 * Data minimization: callers pass counts, reasons and guild IDs that are on the
 * allowlist. Message content, tokens and full Discord payloads are never
 * logged. As a second line of defence every field is scrubbed: values under
 * sensitive keys are replaced, and token-shaped / credentialed-URL strings are
 * redacted wherever they appear.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

const SENSITIVE_KEY =
  /token|secret|password|authorization|cookie|content|database_?url|connection/i;
// Discord bot token shape: <base64 id>.<timestamp>.<hmac>
const TOKEN_SHAPE =
  /[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}/g;
// scheme://user:password@host
const CREDENTIAL_URL = /[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]*@/gi;
const MAX_STRING = 300;

export const REDACTED = "[redacted]";

export function redactString(value: string): string {
  const scrubbed = value
    .replace(CREDENTIAL_URL, `${REDACTED}@`)
    .replace(TOKEN_SHAPE, REDACTED);
  return scrubbed.length > MAX_STRING
    ? `${scrubbed.slice(0, MAX_STRING)}...`
    : scrubbed;
}

export function scrub(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= 3) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => scrub(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrub(inner, depth + 1);
  }
  return out;
}

/** Reduce any thrown value to loggable fields (no stack, no payloads). */
export function describeError(error: unknown): {
  name: string;
  code?: string;
  message: string;
} {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return {
      name: error.name,
      ...(typeof code === "string" ? { code } : {}),
      message: redactString(error.message),
    };
  }
  return { name: "NonError", message: redactString(String(error)) };
}

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LoggerOptions {
  write?: (line: string) => void;
  minLevel?: LogLevel;
  now?: () => Date;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const write =
    options.write ?? ((line) => void process.stdout.write(`${line}\n`));
  const min = ORDER[options.minLevel ?? "info"];
  const now = options.now ?? (() => new Date());

  const emit = (level: LogLevel, event: string, fields?: LogFields) => {
    if (ORDER[level] < min) return;
    const entry = {
      time: now().toISOString(),
      level,
      event,
      ...(scrub(fields ?? {}) as Record<string, unknown>),
    };
    write(JSON.stringify(entry));
  };

  return {
    debug: (event, fields) => emit("debug", event, fields),
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields) => emit("warn", event, fields),
    error: (event, fields) => emit("error", event, fields),
  };
}

/** Logger that discards everything (tests). */
export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
