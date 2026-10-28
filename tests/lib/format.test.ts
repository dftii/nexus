import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatDateTimeUtc,
  formatLongDate,
  formatNumber,
  formatPercent,
  formatShortDate,
  formatSignedNumber,
  formatSignedPercent,
} from "@/lib/format";

describe("number formatting (en-US)", () => {
  it("groups thousands", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(0)).toBe("0");
  });

  it("rounds to integers", () => {
    expect(formatNumber(41.6)).toBe("42");
  });

  it("formats compact values for axes", () => {
    expect(formatCompact(5600)).toBe("5.6K");
    expect(formatCompact(950)).toBe("950");
  });

  it("formats percent with one decimal", () => {
    expect(formatPercent(0.0421)).toBe("4.2%");
  });

  it("signs percent changes explicitly", () => {
    expect(formatSignedPercent(0.0421)).toBe("+4.2%");
    expect(formatSignedPercent(-0.1)).toBe("-10.0%");
    expect(formatSignedPercent(0)).toBe("0.0%");
  });

  it("does not show a sign for changes that round to zero", () => {
    expect(formatSignedPercent(0.00001)).toBe("0.0%");
    expect(formatSignedPercent(-0.00001)).toBe("0.0%");
  });

  it("signs integer changes explicitly", () => {
    expect(formatSignedNumber(12)).toBe("+12");
    expect(formatSignedNumber(-1500)).toBe("-1,500");
    expect(formatSignedNumber(0)).toBe("0");
  });
});

describe("date formatting (UTC)", () => {
  it("formats a calendar day", () => {
    expect(formatShortDate("2026-10-26")).toBe("Oct 26");
    expect(formatLongDate("2026-10-26")).toBe("Oct 26, 2026");
  });

  it("does not shift days near midnight UTC", () => {
    expect(formatShortDate("2026-01-01T00:00:00Z")).toBe("Jan 1");
    expect(formatShortDate("2025-12-31T23:59:59Z")).toBe("Dec 31");
  });

  it("formats date-times in UTC with a label", () => {
    expect(formatDateTimeUtc("2026-10-26T17:42:00Z")).toBe("Oct 26, 17:42 UTC");
    expect(formatDateTimeUtc("2026-10-26T00:05:00Z")).toBe("Oct 26, 00:05 UTC");
  });
});
