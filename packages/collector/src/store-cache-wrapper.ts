import type { Cache, Logger, Store } from '@walkeros/core';
import { compileMatcher } from '@walkeros/core';

/**
 * Options passed to `wrapStoreWithCache`. Pre-resolved by `initStores` phase
 * 2 so the wrapper itself stays small and side-effect free at construction.
 *
 * - `cacheStore` is the store layer where cached values live. Defaults to
 *   the collector's `__cache` instance, but may be any other initialized
 *   store (e.g. a fs-backed cache for cross-process sharing).
 * - `namespace` is the prefix prepended to every key written to the cache
 *   layer. Defaults to `storeId` when the user did not override
 *   `cache.namespace`.
 * - `logger` is the collector's scoped logger, used for the best-effort
 *   warnings emitted when a cache-side write or delete fails. Optional only
 *   to keep test setups lightweight — production call sites pass
 *   `collector.logger`.
 */
export interface WrappedStoreOptions {
  storeId: string;
  cacheConfig: Cache.Cache<Cache.StoreCacheRule>;
  cacheStore: Store.Instance;
  namespace: string;
  logger?: Logger.Instance;
}

interface CompiledStoreCacheRule {
  match: (context: Record<string, unknown>) => boolean;
  ttl: number;
}

/**
 * Per-wrapped-store observability counters. The `evictions_*` counters live on
 * the underlying cache store (`createCacheStore` returns its own counters
 * surface for the global `__cache`), so they are deliberately absent here.
 *
 * Semantics:
 * - `hits` — `cacheStore.get` returned a defined value.
 * - `misses` — cache returned undefined AND no in-flight Promise was joined
 *   (this caller is the one driving the backing fetch).
 * - `populates` — the wrapper wrote into the cache after a backing MISS that
 *   returned a defined value AND matched a rule.
 * - `writes` — every call to `wrapper.set`, regardless of cache outcome.
 * - `deletes` — every call to `wrapper.delete`.
 * - `inflight_dedups` — a get found an in-flight Promise on the same key and
 *   joined it instead of starting a new backing call.
 */
export interface WrappedStoreCounters {
  hits: number;
  misses: number;
  populates: number;
  writes: number;
  deletes: number;
  inflight_dedups: number;
}

/**
 * Public-facing extension of `Store.Instance` with the per-wrapper counter
 * surface. Consumers that need observability (operator UIs, debug endpoints)
 * cast to this type via `as WrappedStoreInstance`; everything else continues
 * to see the canonical `Store.Instance` shape and stays decoupled from the
 * wrapper's internals.
 */
export interface WrappedStoreInstance extends Store.Instance {
  /**
   * Snapshot accessor: returns a fresh copy of the counter map on every
   * access. Mutating the returned object never affects internal state, so
   * callers can serialize, diff, or send the snapshot freely. The returned
   * object always carries every counter key, zero-initialized.
   */
  readonly counters: WrappedStoreCounters;
}

/**
 * Wrap a backing `Store.Instance` with a read-through cache layer.
 *
 * Read semantics:
 *   1. Probe the cache at `namespace:key`. Any non-undefined value is a HIT.
 *   2. On MISS, delegate to `backing.get(key)`.
 *   3. If the backing returned a defined value AND a rule matches the
 *      `{ key, value }` context, populate the cache with `rule.ttl * 1000` ms.
 *      Negative caching (caching `undefined`) is intentionally not supported.
 *
 * Write semantics (`set` / `delete`) follow the "cache is advisory" policy
 * documented in `docs/plans/2026-05-13-store-cache-design.md` (Write path and
 * error policy):
 *   - Backing first. If `backing.set`/`backing.delete` throws, the wrapper
 *     throws and the cache layer is never touched. The backing is the source
 *     of truth and its failures must surface to the caller.
 *   - Cache best-effort. After a successful backing write, attempt the cache
 *     write. A throwing cache layer is logged via `logger.warn` and swallowed
 *     so the wrapper still resolves successfully — the next read will MISS
 *     and re-populate. Failed cache deletes leave a stale entry that serves
 *     until TTL; the warning lets operators react.
 */
export function wrapStoreWithCache(
  backing: Store.Instance,
  opts: WrappedStoreOptions,
): WrappedStoreInstance {
  const { cacheConfig, cacheStore, namespace, logger, storeId } = opts;

  // Closure-scoped counters. Mutated directly at each path; the public
  // `counters` accessor on the returned instance returns a fresh shallow copy
  // so external consumers cannot mutate internal state.
  const counters: WrappedStoreCounters = {
    hits: 0,
    misses: 0,
    populates: 0,
    writes: 0,
    deletes: 0,
    inflight_dedups: 0,
  };

  // Pre-compile each rule's matcher once at wrap time. Rules without a `match`
  // clause are treated as always-matching, mirroring the EventCacheRule
  // helpers in `packages/core/src/cache.ts`.
  const compiledRules: CompiledStoreCacheRule[] = cacheConfig.rules.map(
    (rule) => ({
      match: rule.match ? compileMatcher(rule.match) : () => true,
      ttl: rule.ttl,
    }),
  );

  const prefixed = (key: string): string => `${namespace}:${key}`;

  function findMatchingRule(
    key: string,
    value: unknown,
  ): CompiledStoreCacheRule | undefined {
    // Store-cache context shape is `{ key, value? }` — no `ingest`. The value
    // is omitted when the caller has not yet read from the backing (e.g.
    // future write-path callers).
    const ctx: Record<string, unknown> =
      value === undefined ? { key } : { key, value };
    return compiledRules.find((r) => r.match(ctx));
  }

  // Closure-scoped in-flight registry: N concurrent gets on the same cold key
  // share one backing call. Keyed by the namespaced cache key so distinct
  // backing keys never collide. The entry is removed in `finally` so a
  // settled (resolved or rejected) Promise never lingers — a subsequent get
  // either hits the now-populated cache or retries the backing.
  const inFlight = new Map<string, Promise<unknown>>();

  return {
    type: backing.type,
    config: backing.config,
    setup: backing.setup,

    // Snapshot accessor. Returning a fresh shallow copy on every read keeps
    // the internal counter object un-aliased: consumers that store, diff, or
    // serialize the snapshot cannot inadvertently mutate state.
    get counters(): WrappedStoreCounters {
      return { ...counters };
    },

    async get(key: string): Promise<unknown> {
      const ns = prefixed(key);
      const cached = await cacheStore.get(ns);
      if (cached !== undefined) {
        counters.hits++;
        return cached;
      }

      // Single-flight: if another caller is already fetching this key, join
      // their Promise rather than starting a second backing call.
      const existing = inFlight.get(ns);
      if (existing) {
        counters.inflight_dedups++;
        return existing;
      }

      // This caller drives the backing fetch — count the MISS once here so
      // joined callers above are not double-counted as misses too.
      counters.misses++;

      const promise = (async () => {
        try {
          const value = await backing.get(key);
          if (value === undefined) return undefined;

          const rule = findMatchingRule(key, value);
          if (rule) {
            // Best-effort cache populate. Mirrors the Task 8 write-path
            // policy: backing has already returned, so a throwing cache layer
            // must not surface as an unhandled rejection on the shared
            // Promise that other concurrent callers are awaiting.
            try {
              // `cache.ttl` is documented in seconds; the underlying cache
              // store accepts ms. Multiply once at the boundary to keep the
              // rest of the pipeline consistent with EventCache semantics.
              await cacheStore.set(ns, value, rule.ttl * 1000);
              // Count the populate only after the cache write resolves so a
              // failed populate (logged below) does not inflate the counter.
              counters.populates++;
            } catch (error) {
              warnCacheFailure('set', key, error);
            }
          }
          return value;
        } finally {
          // Always release the slot — on resolve so the next read hits the
          // now-populated cache, on reject so a transient backing failure
          // doesn't freeze the key forever behind a dead Promise.
          inFlight.delete(ns);
        }
      })();
      inFlight.set(ns, promise);
      return promise;
    },

    async set(key: string, value: unknown, ttl?: number): Promise<void> {
      // Count every set the moment the wrapper is entered, before any IO.
      // The counter reflects intent (how many writes the wrapper has been
      // asked to perform), independent of backing or cache success.
      counters.writes++;

      // Backing first. A throw here propagates: backing is the source of
      // truth, callers must see real write failures.
      await backing.set(key, value, ttl);

      const rule = findMatchingRule(key, value);
      if (!rule) return;

      // Best-effort cache populate. Wrap only the cache-side call: backing
      // errors above have already propagated, so this try/catch is scoped to
      // the advisory layer.
      try {
        await cacheStore.set(prefixed(key), value, rule.ttl * 1000);
      } catch (error) {
        warnCacheFailure('set', key, error);
      }
    },

    async delete(key: string): Promise<void> {
      // Mirrors `writes`: count intent at entry, before backing or cache IO.
      counters.deletes++;

      // Backing first; same propagation rules as `set`.
      await backing.delete(key);

      try {
        await cacheStore.delete(prefixed(key));
      } catch (error) {
        warnCacheFailure('delete', key, error);
      }
    },
  };

  function warnCacheFailure(
    op: 'set' | 'delete',
    key: string,
    error: unknown,
  ): void {
    const message = `store-cache(${storeId}): cache ${op} failed for "${key}"; backing succeeded, continuing`;
    if (logger) {
      logger.warn(message, { error });
    } else {
      // Defensive fallback so unit tests that do not thread a logger still
      // surface the failure rather than swallowing it silently. Production
      // call sites in `store.ts` always pass `collector.logger`.
      // eslint-disable-next-line no-console
      console.warn(message, error);
    }
  }
}
