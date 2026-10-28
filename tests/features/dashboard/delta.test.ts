import { describe, expect, it } from "vitest";
import { paddedDomain } from "@/features/dashboard/lib/chart";
import { buildMetric, computeDelta, sum } from "@/features/dashboard/lib/delta";

describe("computeDelta", () => {
  it("computes an increase", () => {
    expect(computeDelta(110, 100)).toEqual({
      absolute: 10,
      ratio: 0.1,
      direction: "up",
    });
  });

  it("computes a decrease", () => {
    const delta = computeDelta(75, 100);
    expect(delta.absolute).toBe(-25);
    expect(delta.ratio).toBe(-0.25);
    expect(delta.direction).toBe("down");
  });

  it("reports no change as flat", () => {
    expect(computeDelta(5, 5)).toEqual({
      absolute: 0,
      ratio: 0,
      direction: "flat",
    });
  });

  it("has no ratio when the previous value is zero", () => {
    expect(computeDelta(8, 0)).toEqual({
      absolute: 8,
      ratio: null,
      direction: "up",
    });
  });
});

describe("buildMetric / sum", () => {
  it("keeps value, previous and delta together", () => {
    const metric = buildMetric(120, 100);
    expect(metric.value).toBe(120);
    expect(metric.previous).toBe(100);
    expect(metric.delta.ratio).toBeCloseTo(0.2);
  });

  it("sums numbers and handles empty input", () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([])).toBe(0);
  });
});

describe("paddedDomain", () => {
  it("rounds outwards to the step", () => {
    expect(paddedDomain([4871, 5530], 100)).toEqual([4800, 5600]);
  });

  it("never returns an empty range", () => {
    expect(paddedDomain([500, 500], 100)).toEqual([500, 600]);
    expect(paddedDomain([], 100)).toEqual([0, 100]);
  });
});
