import { describe, expect, it } from "vitest";
import { parseRange } from "@/lib/analytics-range";
import {
  buildHeatmap,
  EPOCH,
  isAggregationStale,
  mergeChannels,
  mergeDaily,
  rangeStart,
  rawStart,
  shareOf,
  STALE_GRACE_MS,
} from "@/server/activity/pure";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("parseRange", () => {
  it.each([
    ["7", 7],
    ["30", 30],
    ["90", 90],
  ])("accepts %s", (input, expected) => {
    expect(parseRange(input)).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "0",
    "14",
    "-7",
    "7.5",
    "abc",
    "30; DROP",
    ["7", "30"],
    7,
    null,
  ])("falls back to 30 for %j", (input) => {
    expect(parseRange(input)).toBe(30);
  });
});

describe("rangeStart", () => {
  it("is the first of N calendar days ending today (UTC)", () => {
    const now = new Date("2026-10-29T23:59:59.999Z");
    expect(rangeStart(now, 7)).toEqual(d("2026-10-23"));
    expect(rangeStart(now, 1)).toEqual(d("2026-10-29"));
    expect(rangeStart(now, 90)).toEqual(d("2026-08-01"));
  });
});

describe("rawStart", () => {
  it("is everything when nothing is finalized and the range is unbounded", () => {
    expect(rawStart(null, null)).toEqual(EPOCH);
  });
  it("starts the day after W", () => {
    expect(rawStart(d("2026-10-27"), null)).toEqual(d("2026-10-28"));
  });
  it("uses the later of the range start and the day after W", () => {
    expect(rawStart(d("2026-10-27"), d("2026-10-20"))).toEqual(d("2026-10-28"));
    expect(rawStart(d("2026-10-10"), d("2026-10-20"))).toEqual(d("2026-10-20"));
    expect(rawStart(null, d("2026-10-20"))).toEqual(d("2026-10-20"));
  });
});

describe("mergeDaily", () => {
  const row = (day: string, messages: number, authors = 1) => ({
    day,
    messages,
    authors,
  });

  it("reads days <= W from aggregates and days > W from raw, never both", () => {
    // Both sources report the boundary day and the day after: only the right
    // one counts, so nothing is double counted.
    const points = mergeDaily(
      d("2026-10-26"),
      d("2026-10-29"),
      d("2026-10-27"),
      [
        row("2026-10-26", 10, 3),
        row("2026-10-27", 20, 4),
        row("2026-10-28", 999),
      ],
      [
        row("2026-10-26", 888),
        row("2026-10-27", 777),
        row("2026-10-28", 5, 2),
        row("2026-10-29", 6, 1),
      ],
    );
    expect(points).toEqual([
      { date: "2026-10-26", messages: 10, authors: 3 },
      { date: "2026-10-27", messages: 20, authors: 4 },
      { date: "2026-10-28", messages: 5, authors: 2 },
      { date: "2026-10-29", messages: 6, authors: 1 },
    ]);
    expect(points.reduce((a, p) => a + p.messages, 0)).toBe(41);
  });

  it("fills days without data with zeros", () => {
    const points = mergeDaily(
      d("2026-10-25"),
      d("2026-10-27"),
      d("2026-10-25"),
      [],
      [],
    );
    expect(points).toEqual([
      { date: "2026-10-25", messages: 0, authors: 0 },
      { date: "2026-10-26", messages: 0, authors: 0 },
      { date: "2026-10-27", messages: 0, authors: 0 },
    ]);
  });

  it("uses raw for every day while nothing is finalized", () => {
    const points = mergeDaily(
      d("2026-10-28"),
      d("2026-10-29"),
      null,
      [row("2026-10-28", 100)],
      [row("2026-10-28", 3), row("2026-10-29", 4)],
    );
    expect(points.map((p) => p.messages)).toEqual([3, 4]);
  });
});

describe("shareOf / mergeChannels", () => {
  it("handles a zero total", () => {
    expect(shareOf(0, 0)).toBe(0);
    expect(shareOf(1, 4)).toBe(0.25);
  });

  it("adds aggregate and raw counts per channel, sorts, names and shares", () => {
    const rows = mergeChannels(
      [
        { channelId: "a", messages: 30 },
        { channelId: "b", messages: 10 },
      ],
      [
        { channelId: "b", messages: 20 },
        { channelId: "c", messages: 40 },
      ],
      new Map([
        ["a", 5],
        ["b", 6],
      ]),
      new Map([
        ["a", "general"],
        ["c", "off-topic"],
      ]),
    );
    expect(rows).toEqual([
      {
        channelId: "c",
        name: "off-topic",
        messages: 40,
        share: 0.4,
        authors: 0,
      },
      { channelId: "a", name: "general", messages: 30, share: 0.3, authors: 5 },
      { channelId: "b", name: null, messages: 30, share: 0.3, authors: 6 },
    ]);
    expect(rows.reduce((acc, r) => acc + r.messages, 0)).toBe(100);
    expect(rows.reduce((acc, r) => acc + r.share, 0)).toBeCloseTo(1);
  });

  it("reports authors as null when not available and drops empty channels", () => {
    const rows = mergeChannels(
      [
        { channelId: "a", messages: 2 },
        { channelId: "z", messages: 0 },
      ],
      [],
      null,
      new Map(),
    );
    expect(rows).toEqual([
      { channelId: "a", name: null, messages: 2, share: 1, authors: null },
    ]);
  });

  it("is empty for no data", () => {
    expect(mergeChannels([], [], null, new Map())).toEqual([]);
  });
});

describe("buildHeatmap", () => {
  it("is Monday-first and sums repeated slots", () => {
    const map = buildHeatmap([
      { dow: 1, hour: 9, count: 4 }, // Monday
      { dow: 0, hour: 23, count: 7 }, // Sunday
      { dow: 1, hour: 9, count: 1 },
      { dow: 3, hour: 30, count: 99 }, // invalid hour ignored
    ]);
    expect(map.cells[0]?.[9]).toBe(5);
    expect(map.cells[6]?.[23]).toBe(7);
    expect(map.max).toBe(7);
    expect(map.total).toBe(12);
    expect(map.cells).toHaveLength(7);
    expect(map.cells.every((r) => r.length === 24)).toBe(true);
  });

  it("is all zeros when empty", () => {
    expect(buildHeatmap([])).toMatchObject({ max: 0, total: 0 });
  });
});

describe("isAggregationStale", () => {
  const noon = new Date("2026-10-29T12:00:00.000Z");
  const aggregatedAt = new Date("2026-10-29T11:50:00.000Z");

  it("is fresh when yesterday is finalized", () => {
    expect(
      isAggregationStale(
        {
          finalizedThrough: d("2026-10-28"),
          aggregatedAt,
          earliestRawAt: d("2026-10-01"),
        },
        noon,
      ),
    ).toBe(false);
  });

  it("is stale when yesterday is not finalized", () => {
    expect(
      isAggregationStale(
        {
          finalizedThrough: d("2026-10-27"),
          aggregatedAt,
          earliestRawAt: d("2026-10-01"),
        },
        noon,
      ),
    ).toBe(true);
  });

  it("gives a grace period after 00:00 UTC", () => {
    const c = {
      finalizedThrough: d("2026-10-27"),
      aggregatedAt,
      earliestRawAt: d("2026-10-01"),
    };
    const midnight = d("2026-10-29").getTime();
    expect(isAggregationStale(c, new Date(midnight + STALE_GRACE_MS - 1))).toBe(
      false,
    );
    expect(isAggregationStale(c, new Date(midnight + STALE_GRACE_MS))).toBe(
      true,
    );
  });

  it("is stale when never aggregated but older raw events exist", () => {
    expect(
      isAggregationStale(
        {
          finalizedThrough: null,
          aggregatedAt: null,
          earliestRawAt: new Date("2026-10-28T10:00:00.000Z"),
        },
        noon,
      ),
    ).toBe(true);
  });

  it("is not stale with nothing to aggregate", () => {
    expect(
      isAggregationStale(
        { finalizedThrough: null, aggregatedAt: null, earliestRawAt: null },
        noon,
      ),
    ).toBe(false);
    // Only today's events: today is never finalized.
    expect(
      isAggregationStale(
        {
          finalizedThrough: null,
          aggregatedAt: null,
          earliestRawAt: new Date("2026-10-29T03:00:00.000Z"),
        },
        noon,
      ),
    ).toBe(false);
  });
});
