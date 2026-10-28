import type { Delta, Metric } from "../types";

/** Change between two values. `ratio` is null when `previous` is 0. */
export function computeDelta(current: number, previous: number): Delta {
  const absolute = current - previous;
  const ratio = previous === 0 ? null : absolute / previous;
  const direction = absolute > 0 ? "up" : absolute < 0 ? "down" : "flat";
  return { absolute, ratio, direction };
}

export function buildMetric(value: number, previous: number): Metric {
  return { value, previous, delta: computeDelta(value, previous) };
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
