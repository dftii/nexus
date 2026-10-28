export { DEFAULT_RANGE, parseRange, RANGES } from "@/lib/analytics-range";
export type { RangeDays } from "@/lib/analytics-range";

import {
  addUtcDays,
  startOfUtcDay,
  utcDayKey,
  utcDayRange,
} from "@/lib/utc-day";

/**
 * Pure helpers of the analytics read side (no I/O). The calculation rule they
 * encode: with W = the community's finalized-through day, days <= W come ONLY
 * from the aggregate tables and days > W ONLY from raw events, so a day is
 * never counted from both sources.
 */

/** Raw events are guaranteed to exist this long (the retention minimum). */
export const RAW_GUARANTEED_DAYS = 30;
/** Aggregation is not flagged late before this long after 00:00 UTC. */
export const STALE_GRACE_MS = 60 * 60 * 1000;

/** First UTC day of a window of `days` calendar days that ends today. */
export function rangeStart(now: Date, days: number): Date {
  return addUtcDays(startOfUtcDay(now), -(days - 1));
}

/**
 * Where raw events start to count for days >= `from`: the later of `from` and
 * the day after W. Null W means everything is raw. `EPOCH` stands in for
 * "no lower bound" so queries never need a NULL parameter.
 */
export const EPOCH = new Date(0);
export function rawStart(w: Date | null, from: Date | null): Date {
  const afterW = w ? addUtcDays(startOfUtcDay(w), 1) : EPOCH;
  return from && from > afterW ? from : afterW;
}

export interface DayRow {
  /** YYYY-MM-DD (UTC) */
  day: string;
  messages: number;
  authors: number;
}
export interface DailyPoint {
  date: string;
  messages: number;
  authors: number;
}

/**
 * One point per UTC day from `from` to `to`: the aggregate row when the day is
 * <= W, the raw row otherwise, zeros when the source has no row. A row from
 * the wrong source is ignored, which is what prevents double counting.
 */
export function mergeDaily(
  from: Date,
  to: Date,
  w: Date | null,
  aggregate: readonly DayRow[],
  raw: readonly DayRow[],
): DailyPoint[] {
  const wKey = w ? utcDayKey(w) : null;
  const fromAgg = new Map(aggregate.map((r) => [r.day, r]));
  const fromRaw = new Map(raw.map((r) => [r.day, r]));
  return utcDayRange(from, to).map((date) => {
    const row = (wKey !== null && date <= wKey ? fromAgg : fromRaw).get(date);
    return { date, messages: row?.messages ?? 0, authors: row?.authors ?? 0 };
  });
}

export function shareOf(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

export interface ChannelCount {
  channelId: string;
  messages: number;
}
export interface ChannelRow {
  channelId: string;
  /** Null when the bot has not stored this channel's name. */
  name: string | null;
  messages: number;
  /** 0..1 of the community's messages in the range. */
  share: number;
  /** Distinct authors in the range; null when not available (ranges > 30 days). */
  authors: number | null;
}

/** Aggregate (days <= W) + raw (days > W) counts per channel, biggest first. */
export function mergeChannels(
  aggregate: readonly ChannelCount[],
  raw: readonly ChannelCount[],
  authors: ReadonlyMap<string, number> | null,
  names: ReadonlyMap<string, string>,
): ChannelRow[] {
  const totals = new Map<string, number>();
  for (const { channelId, messages } of [...aggregate, ...raw]) {
    totals.set(channelId, (totals.get(channelId) ?? 0) + messages);
  }
  const all = [...totals.entries()].filter(([, messages]) => messages > 0);
  const total = all.reduce((acc, [, messages]) => acc + messages, 0);
  return all
    .map(([channelId, messages]) => ({
      channelId,
      name: names.get(channelId) ?? null,
      messages,
      share: shareOf(messages, total),
      authors: authors ? (authors.get(channelId) ?? 0) : null,
    }))
    .sort(
      (a, b) =>
        b.messages - a.messages || a.channelId.localeCompare(b.channelId),
    );
}

export interface Heatmap {
  /** Rows Monday..Sunday, columns hour 0..23 (UTC). */
  cells: number[][];
  max: number;
  total: number;
}

/** Raw (DOW 0 = Sunday, hour) counts -> Monday-first 7x24 grid. */
export function buildHeatmap(
  rows: readonly { dow: number; hour: number; count: number }[],
): Heatmap {
  const cells = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  let max = 0;
  let total = 0;
  for (const { dow, hour, count } of rows) {
    const row = cells[(dow + 6) % 7];
    if (!row || hour < 0 || hour > 23) continue;
    row[hour] = (row[hour] ?? 0) + count;
    max = Math.max(max, row[hour] ?? 0);
    total += count;
  }
  return { cells, max, total };
}

/**
 * Daily totals are late when yesterday is not finalized (after a grace period
 * past 00:00 UTC), or when nothing was ever aggregated while raw events from
 * before today exist. Numbers stay correct either way (days after W are read
 * from raw events); this only drives an explanatory note.
 */
export function isAggregationStale(
  c: {
    finalizedThrough: Date | null;
    aggregatedAt: Date | null;
    earliestRawAt: Date | null;
  },
  now: Date,
): boolean {
  const today = startOfUtcDay(now);
  if (now.getTime() < today.getTime() + STALE_GRACE_MS) return false;
  if (c.finalizedThrough && c.aggregatedAt) {
    return startOfUtcDay(c.finalizedThrough) < addUtcDays(today, -1);
  }
  return c.earliestRawAt !== null && c.earliestRawAt < today;
}
