/**
 * Y-axis domain for a series that should not start at zero (e.g. a running
 * total), padded outwards to multiples of `step`. Empty input gives [0, step].
 */
export function paddedDomain(
  values: readonly number[],
  step: number,
): [number, number] {
  if (values.length === 0) return [0, step];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lower = Math.max(0, Math.floor(min / step) * step);
  let upper = Math.ceil(max / step) * step;
  if (upper === lower) upper = lower + step;
  return [lower, upper];
}
