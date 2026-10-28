import { afterEach, describe, expect, it } from "vitest";
import {
  getAuthEnv,
  getEnv,
  isAuthConfigured,
  parseEnv,
  resetEnvCache,
} from "@/lib/env";

const validUrl = "postgresql://user:secret-pass@localhost:5432/db";

describe("parseEnv", () => {
  it("accepts a valid DATABASE_URL and defaults NODE_ENV", () => {
    const env = parseEnv({ DATABASE_URL: validUrl });
    expect(env.DATABASE_URL).toBe(validUrl);
    expect(env.NODE_ENV).toBe("development");
  });

  it("accepts the postgres:// scheme", () => {
    expect(() =>
      parseEnv({ DATABASE_URL: "postgres://u:p@localhost/db" }),
    ).not.toThrow();
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-postgres URL without echoing the value", () => {
    const bad = "mysql://user:secret-pass@localhost/db";
    let message = "";
    try {
      parseEnv({ DATABASE_URL: bad });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/DATABASE_URL/);
    expect(message).not.toContain("secret-pass");
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() =>
      parseEnv({ DATABASE_URL: validUrl, NODE_ENV: "staging" }),
    ).toThrow(/NODE_ENV/);
  });
});

describe("getEnv", () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
    resetEnvCache();
  });

  it("is lazy: importing the module does not throw without DATABASE_URL", () => {
    delete process.env.DATABASE_URL;
    resetEnvCache();
    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });

  it("reads process.env and memoises the result", () => {
    process.env.DATABASE_URL = validUrl;
    resetEnvCache();
    const first = getEnv();
    process.env.DATABASE_URL = "postgresql://other@localhost/other";
    expect(getEnv()).toBe(first);
  });
});

describe("auth env", () => {
  const full = {
    AUTH_SECRET: "s",
    AUTH_DISCORD_ID: "id",
    AUTH_DISCORD_SECRET: "secret",
  };

  it("is optional: nothing set means not configured, without throwing", () => {
    expect(isAuthConfigured({})).toBe(false);
    expect(getAuthEnv({})).toEqual({
      AUTH_SECRET: undefined,
      AUTH_DISCORD_ID: undefined,
      AUTH_DISCORD_SECRET: undefined,
    });
  });

  it("needs all three variables", () => {
    expect(isAuthConfigured(full)).toBe(true);
    for (const key of Object.keys(full)) {
      expect(isAuthConfigured({ ...full, [key]: undefined })).toBe(false);
    }
  });

  it("treats empty and blank values (as copied from .env.example) as unset", () => {
    expect(isAuthConfigured({ ...full, AUTH_SECRET: "" })).toBe(false);
    expect(isAuthConfigured({ ...full, AUTH_DISCORD_ID: "   " })).toBe(false);
  });
});
