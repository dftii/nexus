import { describe, expect, it } from "vitest";
import { getDashboardData } from "@/features/dashboard/data";
import {
  DEMO_END_DATE,
  HISTORY_DAYS,
  PERIOD_DAYS,
  buildDemoDashboardData,
} from "@/features/dashboard/data/demo";

const data = buildDemoDashboardData();

describe("demo dashboard data", () => {
  it("is deterministic: two builds are deeply equal", () => {
    expect(buildDemoDashboardData()).toEqual(buildDemoDashboardData());
  });

  it("changes with the seed", () => {
    expect(buildDemoDashboardData({ seed: 1 })).not.toEqual(data);
  });

  it("is marked as demo and anchored to the fixed reference date", () => {
    expect(data.source).toBe("demo");
    expect(data.endDate).toBe(DEMO_END_DATE);
    expect(data.periodDays).toBe(PERIOD_DAYS);
  });

  it("has series of the expected length, ending on the reference date", () => {
    expect(data.membership).toHaveLength(HISTORY_DAYS);
    expect(data.messageActivity).toHaveLength(PERIOD_DAYS);
    expect(data.membership.at(-1)?.date).toBe(DEMO_END_DATE);
    expect(data.messageActivity.at(-1)?.date).toBe(DEMO_END_DATE);
  });

  it("has consecutive, ascending daily dates", () => {
    const dates = data.membership.map((p) => p.date);
    for (let i = 1; i < dates.length; i++) {
      const diff =
        (Date.parse(dates[i]!) - Date.parse(dates[i - 1]!)) / 86_400_000;
      expect(diff).toBe(1);
    }
  });

  it("keeps active members at or below total members", () => {
    const { totalMembers, activeMembers } = data.summary;
    expect(activeMembers.value).toBeLessThanOrEqual(totalMembers.value);
    expect(activeMembers.previous).toBeLessThanOrEqual(totalMembers.previous);
  });

  it("has no negative or fractional numbers", () => {
    for (const metric of Object.values(data.summary)) {
      expect(Number.isInteger(metric.value)).toBe(true);
      expect(metric.value).toBeGreaterThanOrEqual(0);
      expect(metric.previous).toBeGreaterThanOrEqual(0);
    }
    for (const point of data.membership) {
      expect(point.members).toBeGreaterThan(0);
      expect(point.joins).toBeGreaterThanOrEqual(0);
      expect(point.leaves).toBeGreaterThanOrEqual(0);
    }
    for (const point of data.messageActivity) {
      expect(point.messages).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps the membership series consistent with joins and leaves", () => {
    for (let i = 1; i < data.membership.length; i++) {
      const prev = data.membership[i - 1]!;
      const cur = data.membership[i]!;
      expect(cur.members).toBe(prev.members + cur.joins - cur.leaves);
    }
    expect(data.summary.totalMembers.value).toBe(
      data.membership.at(-1)!.members,
    );
  });

  it("derives summary totals from the series", () => {
    const messagesInPeriod = data.messageActivity.reduce(
      (total, p) => total + p.messages,
      0,
    );
    expect(data.summary.messages.value).toBe(messagesInPeriod);
    const joinsInPeriod = data.membership
      .slice(-PERIOD_DAYS)
      .reduce((total, p) => total + p.joins, 0);
    expect(data.summary.newMembers.value).toBe(joinsInPeriod);
  });

  it("computes deltas consistent with value and previous", () => {
    for (const metric of Object.values(data.summary)) {
      expect(metric.delta.absolute).toBe(metric.value - metric.previous);
      if (metric.previous !== 0) {
        expect(metric.delta.ratio).toBeCloseTo(
          (metric.value - metric.previous) / metric.previous,
        );
      }
    }
  });

  it("lists recent activity newest first with unique ids", () => {
    const events = data.recentActivity;
    expect(events.length).toBeGreaterThan(0);
    const times = events.map((e) => Date.parse(e.timestamp));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it("uses obviously fake usernames", () => {
    for (const event of data.recentActivity) {
      expect(event.username).toMatch(/_demo$/);
    }
  });

  it("is what getDashboardData returns", async () => {
    await expect(getDashboardData()).resolves.toEqual(data);
  });
});
