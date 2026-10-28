import { describe, expect, it } from "vitest";
import {
  DEMO_PATH,
  getNavItem,
  isActivePath,
  isDemoPath,
  navMetadata,
  navigation,
  resolveNavHref,
} from "@/config/navigation";

describe("navigation config", () => {
  it("has exactly two available items: Overview at / and Analytics (Phase 4)", () => {
    const available = navigation.filter((item) => item.status === "available");
    expect(available.map((item) => item.href)).toEqual(["/", "/analytics"]);
    expect(available[0]).toMatchObject({ label: "Overview", href: "/" });
  });

  it("has unique hrefs and labels", () => {
    expect(new Set(navigation.map((i) => i.href)).size).toBe(navigation.length);
    expect(new Set(navigation.map((i) => i.label)).size).toBe(
      navigation.length,
    );
  });

  it("lists the expected sections in order", () => {
    expect(navigation.map((i) => i.label)).toEqual([
      "Overview",
      "Analytics",
      "Automations",
      "Moderation",
      "Leaderboard",
      "Settings",
    ]);
  });

  it("gives every unavailable item a roadmap phase and planned scope", () => {
    for (const item of navigation.filter((i) => i.status === "soon")) {
      expect(item.phase).toBeGreaterThan(0);
      expect(item.planned?.length).toBeGreaterThan(0);
    }
  });

  it("finds items by exact href", () => {
    expect(getNavItem("/analytics")?.label).toBe("Analytics");
    expect(getNavItem("/nope")).toBeUndefined();
  });

  it("matches active paths exactly for / and by prefix elsewhere", () => {
    const overview = getNavItem("/")!;
    const analytics = getNavItem("/analytics")!;
    expect(isActivePath(overview, "/")).toBe(true);
    expect(isActivePath(overview, "/analytics")).toBe(false);
    expect(isActivePath(analytics, "/analytics")).toBe(true);
    expect(isActivePath(analytics, "/analytics/channels")).toBe(true);
    expect(isActivePath(analytics, "/analytics-old")).toBe(false);
  });

  it("derives route metadata from the config", () => {
    expect(navMetadata("/moderation").title).toBe("Moderation");
    expect(() => navMetadata("/missing")).toThrow();
  });
});

describe("navigation config: demo", () => {
  it("has a demo href only for Overview", () => {
    const withDemo = navigation.filter((i) => i.demoHref);
    expect(withDemo.map((i) => i.href)).toEqual(["/"]);
    expect(withDemo[0]?.demoHref).toBe(DEMO_PATH);
  });

  it("detects the demo route and nothing that merely starts with it", () => {
    expect(isDemoPath("/demo")).toBe(true);
    expect(isDemoPath("/demo/x")).toBe(true);
    expect(isDemoPath("/demonstration")).toBe(false);
    expect(isDemoPath("/")).toBe(false);
  });

  it("resolves links and active state per route", () => {
    const overview = getNavItem("/")!;
    const analytics = getNavItem("/analytics")!;
    expect(resolveNavHref(overview, "/demo")).toBe("/demo");
    expect(resolveNavHref(overview, "/onboarding")).toBe("/");
    expect(resolveNavHref(analytics, "/demo")).toBe("/analytics");
    expect(isActivePath(overview, "/demo")).toBe(true);
    expect(isActivePath(overview, "/")).toBe(true);
    expect(isActivePath(overview, "/onboarding")).toBe(false);
  });

  it("no longer promises sign-in as a future Settings feature", () => {
    const settings = getNavItem("/settings")!;
    expect(settings.planned?.join(" ")).not.toMatch(/sign in/i);
  });
});
