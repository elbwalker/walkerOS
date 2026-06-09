import type { StoreValue } from './types/store';

/**
 * Shared cache envelope used by BOTH cache mechanisms (the event cache in
 * `./cache.ts` and the store-cache wrapper in
 * `@walkeros/collector/store-cache-wrapper`). A cached value is wrapped in a
 * plain `{value, exp}` structured object, not a Buffer: the backing store
 * serializes it through the shared store codec (`./store/codec`), so any
 * structured store can persist it byte-exact, and a TTL-native tier
 * (in-memory `__cache`, Redis) can additionally evict via the `ttl` arg.
 *
 * The envelope owns expiry interpretation, not the store contract:
 * `StoreValue` carries no TTL field. The physical envelope keys are
 * namespaced (`__walkeros_cache_v__` / `__walkeros_cache_exp__`) so a user
 * value that happens to be shaped `{ value, exp }` is never mistaken for an
 * envelope, and conversely a wrapped envelope is unambiguous on read.
 */

const ENVELOPE_VALUE = '__walkeros_cache_v__';
const ENVELOPE_EXP = '__walkeros_cache_exp__';

/** A wrapped cache envelope as it is persisted into the backing store. */
export type CacheEnvelope = {
  [ENVELOPE_VALUE]: StoreValue;
  [ENVELOPE_EXP]?: number;
};

function isRecord(value: unknown): value is Record<string, StoreValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Wrap a value in a `{value, exp}` envelope. When `ttlMs` is given, `exp` is
 * `now() + ttlMs`; when omitted, `exp` is left off entirely (no expiry).
 *
 * `now` is injectable so tests do not depend on ambient wall-clock time;
 * production callers omit it and the helper falls back to `Date.now`.
 */
export function wrapCacheEnvelope(
  value: StoreValue,
  ttlMs?: number,
  now: () => number = Date.now,
): CacheEnvelope {
  const envelope: CacheEnvelope = { [ENVELOPE_VALUE]: value };
  if (ttlMs !== undefined) envelope[ENVELOPE_EXP] = now() + ttlMs;
  return envelope;
}

/**
 * Read a stored envelope. Returns:
 * - `undefined` when the key is absent (`stored === undefined`).
 * - `{ expired: true }` when the envelope's `exp` has elapsed (caller should
 *   best-effort purge and treat as a MISS).
 * - `{ value }` otherwise.
 *
 * A stored value that is not a recognizable envelope (a raw live value, e.g.
 * a TTL-native tier that holds the value by reference, or a legacy entry) is
 * returned verbatim as `{ value: stored }`, so a non-enveloped HIT degrades
 * gracefully rather than being dropped.
 */
export function readCacheEnvelope(
  stored: StoreValue | undefined,
  now: () => number = Date.now,
): { value: StoreValue } | { expired: true } | undefined {
  if (stored === undefined) return undefined;
  if (!isRecord(stored) || !(ENVELOPE_VALUE in stored))
    return { value: stored };

  const exp = stored[ENVELOPE_EXP];
  if (typeof exp === 'number' && now() > exp) return { expired: true };
  return { value: stored[ENVELOPE_VALUE] };
}
