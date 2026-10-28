/**
 * UTC calendar-day helpers shared by the bot (aggregation, retention) and the
 * web (analytics queries, charts). Phase 4 analytics use UTC days everywhere:
 * a day runs from 00:00:00.000Z to 23:59:59.999Z. A day is represented as a
 * `Date` at its 00:00Z instant, or as a `YYYY-MM-DD` key for charts.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** 00:00Z of the UTC day that contains `at`. */
export function startOfUtcDay(at: Date): Date {
  return new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
  );
}

/** `day` shifted by `days` whole UTC days (negative goes back). */
export function addUtcDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * DAY_MS);
}

/** `YYYY-MM-DD` of the UTC day that contains `at`. */
export function utcDayKey(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** Parse a `YYYY-MM-DD` key back to its 00:00Z instant. */
export function parseUtcDayKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Every day key from `from` to `to` inclusive (both 00:00Z), oldest first. */
export function utcDayRange(from: Date, to: Date): string[] {
  const keys: string[] = [];
  for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
    keys.push(utcDayKey(new Date(t)));
  }
  return keys;
}
