/**
 * Number and date formatting with a fixed locale (en-US) and UTC time zone,
 * so server and client render identical strings (no hydration mismatch) no
 * matter where the code runs.
 */

const LOCALE = "en-US";

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const dayMonth = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const dayMonthYear = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const dateTime = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

/** 12345 -> "12,345" */
export function formatNumber(value: number): string {
  return integer.format(value);
}

/** 12345 -> "12.3K" (for axis ticks and tight spaces) */
export function formatCompact(value: number): string {
  return compact.format(value);
}

/** Ratio -> unsigned percent: 0.0421 -> "4.2%" */
export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}

/** Ratio -> percent with an explicit sign: 0.0421 -> "+4.2%", -0.1 -> "-10.0%" */
export function formatSignedPercent(ratio: number): string {
  const text = percent.format(Math.abs(ratio));
  if (text === percent.format(0)) return text;
  return `${ratio > 0 ? "+" : "-"}${text}`;
}

/** Integer with an explicit sign: 12 -> "+12", -3 -> "-3" */
export function formatSignedNumber(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${integer.format(Math.abs(value))}`;
}

function toDate(input: string | Date): Date {
  return typeof input === "string" ? new Date(input) : input;
}

/** "2026-10-26" or ISO timestamp -> "Oct 26" (UTC) */
export function formatShortDate(input: string | Date): string {
  return dayMonth.format(toDate(input));
}

/** -> "Oct 26, 2026" (UTC) */
export function formatLongDate(input: string | Date): string {
  return dayMonthYear.format(toDate(input));
}

/** -> "Oct 26, 17:42 UTC" */
export function formatDateTimeUtc(input: string | Date): string {
  return `${dateTime.format(toDate(input))} UTC`;
}
