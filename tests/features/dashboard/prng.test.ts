import { describe, expect, it } from "vitest";
import { mulberry32, noise } from "@/features/dashboard/lib/prng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("differs between seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("stays within [0, 1)", () => {
    const random = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("noise stays within [-1, 1]", () => {
    const random = mulberry32(9);
    for (let i = 0; i < 1000; i++) {
      expect(Math.abs(noise(random))).toBeLessThanOrEqual(1);
    }
  });
});
