/** Delta-seconds (RFC 9110 10.2.3): digits only, so `-1` and `1.5` are unreadable. */
const DELTA_SECONDS = /^\d+$/;

/**
 * An HTTP date starts with a day name in all three formats RFC 9110 5.6.7
 * names. Requiring it keeps `Date.parse` from reading a number such as `-1`
 * as a year.
 */
const HTTP_DATE = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/;

/**
 * The wait after the n-th failure in a row (n ≥ 1), with full jitter:
 * `random() × min(capMs, baseMs × 2^failures)`, in whole ms.
 */
export function fullJitterDelay(
  failures: number,
  options: { baseMs: number; capMs: number; random?: () => number },
): number {
  const random = options.random || Math.random;
  const ceiling = Math.min(options.capMs, options.baseMs * 2 ** failures);
  return Math.floor(random() * ceiling);
}

/**
 * A `Retry-After` value, delta-seconds or an HTTP date, in ms from `now`;
 * `undefined` when absent or unreadable, and never negative.
 * Dates too, unlike core's `retryAfterSeconds`: the app may send one; callers cap it.
 */
export function retryAfterMs(
  header: string | null,
  now: number = Date.now(),
): number | undefined {
  if (header === null) return undefined;
  const value = header.trim();
  if (DELTA_SECONDS.test(value)) return Number(value) * 1000;
  if (!HTTP_DATE.test(value)) return undefined;
  const at = Date.parse(value);
  if (Number.isNaN(at)) return undefined;
  return Math.max(0, at - now);
}
