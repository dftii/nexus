import { z } from "zod";

/** Time ranges the analytics page offers, in days. */
export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];
export const DEFAULT_RANGE: RangeDays = 30;

const rangeSchema = z.enum(["7", "30", "90"]).catch("30");

/** `?range=` value (string, array or absent) -> 7 | 30 | 90; anything else is 30. */
export function parseRange(value: unknown): RangeDays {
  return Number(rangeSchema.parse(value)) as RangeDays;
}
