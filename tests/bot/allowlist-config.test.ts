import { describe, expect, it } from "vitest";
import {
  BotConfigError,
  MAX_HEARTBEAT_INTERVAL_MS,
  MIN_HEARTBEAT_INTERVAL_MS,
  parseBotConfig,
} from "@/bot/config";
import { createAllowlist, parseAllowlist } from "@/bot/services/allowlist";

const G1 = "123456789012345678";
const G2 = "234567890123456789";
const base = {
  DISCORD_BOT_TOKEN: "x.y.z",
  DATABASE_URL: "postgresql://u:p@h/d",
};

describe("parseAllowlist", () => {
  it("is empty for undefined and blank", () => {
    expect(parseAllowlist(undefined)).toEqual({
      ids: [],
      invalidPositions: [],
    });
    expect(parseAllowlist("  ")).toEqual({ ids: [], invalidPositions: [] });
  });

  it("trims, dedupes and ignores empty segments", () => {
    expect(parseAllowlist(` ${G1} , ${G2},${G1},, `).ids).toEqual([G1, G2]);
  });

  it("reports the 1-based position of invalid entries", () => {
    const parsed = parseAllowlist(`${G1},abc,${G2},123`);
    expect(parsed.ids).toEqual([G1, G2]);
    expect(parsed.invalidPositions).toEqual([2, 4]);
  });

  it("accepts 17 to 20 digit snowflakes only", () => {
    expect(parseAllowlist("1".repeat(16)).invalidPositions).toEqual([1]);
    expect(parseAllowlist("1".repeat(17)).ids).toHaveLength(1);
    expect(parseAllowlist("1".repeat(20)).ids).toHaveLength(1);
    expect(parseAllowlist("1".repeat(21)).invalidPositions).toEqual([1]);
  });
});

describe("createAllowlist", () => {
  it("is disabled when empty and rejects everything", () => {
    const list = createAllowlist([]);
    expect(list.enabled).toBe(false);
    expect(list.has(G1)).toBe(false);
  });

  it("matches only listed guilds and never null", () => {
    const list = createAllowlist([G1]);
    expect(list.enabled).toBe(true);
    expect(list.has(G1)).toBe(true);
    expect(list.has(G2)).toBe(false);
    expect(list.has(null)).toBe(false);
    expect(list.has(undefined)).toBe(false);
  });
});

describe("parseBotConfig", () => {
  it("parses a complete environment with defaults", () => {
    const config = parseBotConfig({
      ...base,
      DISCORD_GUILD_ALLOWLIST: ` ${G1}, ${G2} ,${G1}`,
    });
    expect(config).toEqual({
      token: "x.y.z",
      databaseUrl: base.DATABASE_URL,
      allowlist: [G1, G2],
      heartbeatIntervalMs: 60_000,
      retentionDays: 30,
    });
  });

  it("an empty or missing allowlist is valid (processing disabled)", () => {
    expect(parseBotConfig(base).allowlist).toEqual([]);
    expect(
      parseBotConfig({ ...base, DISCORD_GUILD_ALLOWLIST: "" }).allowlist,
    ).toEqual([]);
  });

  it("requires a non-empty token", () => {
    expect(() => parseBotConfig({ ...base, DISCORD_BOT_TOKEN: "  " })).toThrow(
      /DISCORD_BOT_TOKEN is required/,
    );
    expect(() => parseBotConfig({ DATABASE_URL: base.DATABASE_URL })).toThrow(
      BotConfigError,
    );
  });

  it("requires a postgres DATABASE_URL", () => {
    expect(() =>
      parseBotConfig({ ...base, DATABASE_URL: "mysql://x" }),
    ).toThrow(/DATABASE_URL must be a postgresql/);
    expect(() => parseBotConfig({ DISCORD_BOT_TOKEN: "t" })).toThrow(
      /DATABASE_URL is required/,
    );
  });

  it("names the position of a bad allowlist entry, never its value", () => {
    let message = "";
    try {
      parseBotConfig({
        ...base,
        DISCORD_GUILD_ALLOWLIST: `${G1},secret-looking-value`,
      });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("DISCORD_GUILD_ALLOWLIST entry #2");
    expect(message).not.toContain("secret-looking-value");
  });

  it("never leaks the token or the database URL in errors", () => {
    let message = "";
    try {
      parseBotConfig({
        DISCORD_BOT_TOKEN: "my-super-token",
        DATABASE_URL: "mysql://user:pw@host/db",
      });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toContain("my-super-token");
    expect(message).not.toContain("pw@host");
  });

  it("validates the heartbeat interval bounds", () => {
    const interval = (v: string) =>
      parseBotConfig({ ...base, BOT_HEARTBEAT_INTERVAL_MS: v })
        .heartbeatIntervalMs;
    expect(interval("30000")).toBe(30_000);
    expect(interval(String(MIN_HEARTBEAT_INTERVAL_MS))).toBe(
      MIN_HEARTBEAT_INTERVAL_MS,
    );
    expect(interval(String(MAX_HEARTBEAT_INTERVAL_MS))).toBe(
      MAX_HEARTBEAT_INTERVAL_MS,
    );
    for (const bad of ["abc", "1000", "999999", "-5", "1.5"]) {
      expect(() => interval(bad)).toThrow(/BOT_HEARTBEAT_INTERVAL_MS/);
    }
    expect(interval("")).toBe(60_000);
  });
});
