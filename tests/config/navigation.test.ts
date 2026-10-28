import { describe, expect, it } from "vitest";
import {
  getNavItem,
  isActivePath,
  navMetadata,
  navigation,
} from "@/config/navigation";

describe("navigation config", () => {
  it("has exactly one available item and it is the Overview at /", () => {
    const available = navigation.filter((item) => item.status === "available");
    expect(available).toHaveLength(1);
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
