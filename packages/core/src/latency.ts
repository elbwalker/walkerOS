/**
 * Upper bounds of the delivery latency buckets in milliseconds, inclusive. A
 * delivery above the last bound falls into one more bucket, so a histogram
 * has `LATENCY_BOUNDS_MS.length + 1` counts.
 */
export const LATENCY_BOUNDS_MS: readonly number[] = [
  5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
];

/**
 * The bucket of a latency: the index of the first bound it does not exceed,
 * or the last bucket (11) above every bound. A plain loop, since it runs on
 * every delivery and a callback would be one more object per call.
 */
export function latencyBucket(ms: number): number {
  for (let index = 0; index < LATENCY_BOUNDS_MS.length; index++)
    if (ms <= LATENCY_BOUNDS_MS[index]) return index;
  return LATENCY_BOUNDS_MS.length;
}
