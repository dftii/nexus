import { describe, expect, it } from "vitest";
import {
  ADMINISTRATOR,
  MANAGE_GUILD,
  getEligibility,
  isEligibleGuild,
  parsePermissions,
} from "@/server/discord/permissions";

describe("permission constants", () => {
  it("uses the documented bit positions", () => {
    expect(ADMINISTRATOR).toBe(8n);
    expect(MANAGE_GUILD).toBe(32n);
  });
});

describe("parsePermissions", () => {
  it("parses plain decimal strings", () => {
    expect(parsePermissions("8")).toBe(8n);
    expect(parsePermissions("0")).toBe(0n);
  });

  it("keeps bits above 2^53 exactly (no Number precision loss)", () => {
    const high = (1n << 60n) | 8n;
    expect(parsePermissions(high.toString())).toBe(high);
    // A double cannot represent this value exactly; the BigInt path can.
    expect(BigInt(Number(high))).not.toBe(high);
  });

  it.each([
    "",
    " 8",
    "8 ",
    "-8",
    "+8",
    "8.5",
    "0x8",
    "1e3",
    "abc",
    "8n",
    "1".repeat(41),
  ])("treats malformed %j as no permissions", (value) => {
    expect(parsePermissions(value)).toBe(0n);
  });

  it.each([undefined, null, 8, {}, []])(
    "treats non-string %j as no permissions",
    (value) => {
      expect(parsePermissions(value)).toBe(0n);
    },
  );
});

describe("getEligibility / isEligibleGuild", () => {
  it("accepts the owner even with 0 permissions", () => {
    const guild = { owner: true, permissions: "0" };
    expect(getEligibility(guild)).toBe("owner");
    expect(isEligibleGuild(guild)).toBe(true);
  });

  it("accepts Administrator", () => {
    expect(getEligibility({ owner: false, permissions: "8" })).toBe(
      "administrator",
    );
  });

  it("accepts Manage Server", () => {
    expect(getEligibility({ owner: false, permissions: "32" })).toBe(
      "manage_server",
    );
  });

  it("prefers the strongest reason", () => {
    expect(getEligibility({ owner: false, permissions: "40" })).toBe(
      "administrator",
    );
    expect(getEligibility({ owner: true, permissions: "40" })).toBe("owner");
  });

  it("detects the bits when higher bits are set too", () => {
    const perms = ((1n << 60n) | MANAGE_GUILD).toString();
    expect(getEligibility({ owner: false, permissions: perms })).toBe(
      "manage_server",
    );
  });

  it("rejects members with other permissions only", () => {
    // Manage Roles (1<<28) + Kick Members (1<<1), but neither required bit.
    const perms = ((1n << 28n) | (1n << 1n)).toString();
    const guild = { owner: false, permissions: perms };
    expect(getEligibility(guild)).toBeNull();
    expect(isEligibleGuild(guild)).toBe(false);
  });

  it("rejects malformed permission strings", () => {
    expect(isEligibleGuild({ owner: false, permissions: "garbage" })).toBe(
      false,
    );
    expect(isEligibleGuild({ owner: false, permissions: "" })).toBe(false);
  });
});
