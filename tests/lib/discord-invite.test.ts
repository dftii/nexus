import { describe, expect, it } from "vitest";
import {
  BOT_INVITE_PERMISSIONS,
  buildBotInviteUrl,
  isSnowflake,
} from "@/lib/discord-invite";

const CLIENT = "123456789012345678";
const GUILD = "987654321098765432";

describe("buildBotInviteUrl", () => {
  it("builds the exact authorize URL with minimal permissions", () => {
    const url = buildBotInviteUrl({ clientId: CLIENT, guildId: GUILD });
    expect(url).toBe(
      `https://discord.com/oauth2/authorize?client_id=${CLIENT}&scope=bot&permissions=1024&guild_id=${GUILD}&disable_guild_select=true`,
    );
  });

  it("requests only View Channels (1024) and only the bot scope", () => {
    expect(BOT_INVITE_PERMISSIONS).toBe(1 << 10);
    const url = new URL(
      buildBotInviteUrl({ clientId: CLIENT, guildId: GUILD }) ?? "",
    );
    expect(url.origin + url.pathname).toBe(
      "https://discord.com/oauth2/authorize",
    );
    expect(url.searchParams.get("scope")).toBe("bot");
    expect(url.searchParams.get("scope")).not.toContain(
      "applications.commands",
    );
    expect(url.searchParams.get("permissions")).toBe("1024");
    expect(url.searchParams.get("guild_id")).toBe(GUILD);
    expect(url.searchParams.get("disable_guild_select")).toBe("true");
    expect([...url.searchParams.keys()].sort()).toEqual([
      "client_id",
      "disable_guild_select",
      "guild_id",
      "permissions",
      "scope",
    ]);
  });

  it("never carries a secret, token or redirect", () => {
    const text =
      buildBotInviteUrl({ clientId: CLIENT, guildId: GUILD })?.toLowerCase() ??
      "";
    for (const word of ["secret", "token", "redirect", "code", "password"]) {
      expect(text).not.toContain(word);
    }
  });

  it("returns null for missing or malformed ids", () => {
    expect(buildBotInviteUrl({ clientId: null, guildId: GUILD })).toBeNull();
    expect(
      buildBotInviteUrl({ clientId: undefined, guildId: GUILD }),
    ).toBeNull();
    expect(buildBotInviteUrl({ clientId: CLIENT, guildId: "" })).toBeNull();
    expect(buildBotInviteUrl({ clientId: "abc", guildId: GUILD })).toBeNull();
    expect(
      buildBotInviteUrl({ clientId: CLIENT, guildId: "123&scope=admin" }),
    ).toBeNull();
    expect(
      buildBotInviteUrl({ clientId: "1".repeat(16), guildId: GUILD }),
    ).toBeNull();
    expect(
      buildBotInviteUrl({ clientId: CLIENT, guildId: "1".repeat(21) }),
    ).toBeNull();
  });
});

describe("isSnowflake", () => {
  it("accepts 17 to 20 digits only", () => {
    expect(isSnowflake("1".repeat(17))).toBe(true);
    expect(isSnowflake("1".repeat(20))).toBe(true);
    expect(isSnowflake("1".repeat(16))).toBe(false);
    expect(isSnowflake("12345678901234567a")).toBe(false);
    expect(isSnowflake(null)).toBe(false);
  });
});
