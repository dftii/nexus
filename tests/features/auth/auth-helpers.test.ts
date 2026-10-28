import { describe, expect, it } from "vitest";
import { loginErrorMessage } from "@/features/auth/login-errors";
import { safeRedirectPath } from "@/features/auth/redirect";

describe("loginErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(loginErrorMessage(undefined)).toBeNull();
    expect(loginErrorMessage("")).toBeNull();
  });

  it("explains a cancelled authorization", () => {
    expect(loginErrorMessage("AccessDenied")).toBe(
      "You cancelled the Discord authorization. Nothing was changed.",
    );
  });

  it("explains a missing configuration", () => {
    expect(loginErrorMessage("Configuration")).toBe(
      "Sign-in isn't configured on this server.",
    );
  });

  it.each(["OAuthCallbackError", "Callback", "Verification", "whatever"])(
    "uses a generic retry message for %s",
    (code) => {
      expect(loginErrorMessage(code)).toMatch(/try again/i);
    },
  );

  it("never echoes the raw code and ignores prototype keys", () => {
    const message = loginErrorMessage("<script>alert(1)</script>");
    expect(message).not.toContain("script");
    expect(loginErrorMessage("constructor")).toMatch(/try again/i);
    expect(loginErrorMessage("toString")).toMatch(/try again/i);
  });

  it("uses the first value when the parameter is repeated", () => {
    expect(loginErrorMessage(["AccessDenied", "Callback"])).toMatch(
      /cancelled/,
    );
  });
});

describe("safeRedirectPath", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirectPath("/")).toBe("/");
    expect(safeRedirectPath("/onboarding")).toBe("/onboarding");
    expect(safeRedirectPath("/analytics?range=7d#top")).toBe(
      "/analytics?range=7d#top",
    );
  });

  it.each([
    undefined,
    null,
    42,
    "",
    "onboarding",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/ok\nSet-Cookie: x=1",
    "/login",
    "/login?error=x",
    "/api/auth/signout",
    "/" + "a".repeat(300),
  ])("falls back to / for %j", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });
});
