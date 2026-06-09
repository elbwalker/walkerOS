import type { Cache, Collector, Logger, Store } from '@walkeros/core';
import {
  compileMatcher,
  emitStep,
  readCacheEnvelope,
  wrapCacheEnvelope,
} from '@walkeros/core';
import { buildBaseState } from './observerEmit';

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
  /**
   * Optional collector reference for cache-level observability. When
   * provided, the wrapper emits a `FlowState` (`stepType: 'store'`,
   * `meta.op: 'cache'`) on every wrapped `get`, carrying the resolved
   * cache status (`'hit'` or `'miss'`) and the key. Observers attached
   * to `collector.observers` see HIT/MISS without coupling to wrapper
   * internals. Optional only to keep unit-test setups lightweight;
   * production call sites pass it.
   */
  collector?: Collector.Instance;
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
 *   1. Probe the cache at `namespace:key` and interpret the stored
 *      `{value, exp}` envelope via `readCacheEnvelope`. A live envelope is a
 *      HIT. An expired envelope is best-effort purged and treated as a MISS.
 *   2. On MISS, delegate to `backing.get(key)`.
 *   3. If the backing returned a defined value AND a rule matches the
 *      `{ key, value }` context, populate the cache with the value wrapped in
 *      a `{value, exp}` envelope (exp = now + `rule.ttl * 1000` ms) AND pass
 *      the `ttl` arg so a TTL-native tier can proactively evict (dual-write).
 *      The envelope `exp` is authoritative; the `ttl` arg is an eviction hint.
 *      Negative caching (caching `undefined`) is intentionally not supported.
 *
 * Multi-tier: each wrapper wraps independently. When the cache tier is itself
 * a wrapped store, the value is enveloped once per tier (nested envelopes), and
 * each tier strips exactly its own outer envelope on read, so the read chain
 * unwraps as many layers as it wrapped. Nesting depth and payload grow with the
 * number of tiers (negligible for the typical 2-3 tier chain). Each tier owns
 * its own `exp` from its own rule, so the staleness bound is per tier.
 *
 * Write semantics (`set` / `delete`) follow the "cache is advisory" policy
 * documented in `docs/plans/2026-05-13-store-cache-design.md` (Write path and
 * error policy):
 *   - Backing first. If `backing.set`/`backing.delete` throws, the wrapper
 *     throws and the cache layer is never touched. The backing is the source
 *     of truth and its failures must surface to the caller.
 *   - Cache best-effort. After a successful backing write, attempt the cache
 *     write. A throwing cache layer is logged via `logger.warn` and swallowed
 *     so the wrapper still resolves successfully, the next read will MISS
 *     and re-populate. Failed cache deletes leave a stale entry that serves
 *     until TTL; the warning lets operators react.
 */
export function wrapStoreWithCache(
  backing: Store.Instance,
  opts: WrappedStoreOptions,
): WrappedStoreInstance {
  const { cacheConfig, cacheStore, namespace, logger, storeId, collector } =
    opts;

  // Cache observability. Each wrapped `get` resolves to a HIT or MISS;
  // the wrapper emits a `FlowState` on the collector so observers can
  // record cache metadata without coupling to wrapper internals. When
  // `collector` is absent (unit-test path), reporting is skipped.
  const reportCacheStatus = (key: string, status: 'hit' | 'miss'): void => {
    if (!collector) return;
    const state = buildBaseState(collector, {
      stepId: `store.${storeId}`,
      stepType: 'store',
      phase: 'in',
      eventId: '',
      now: Date.now(),
    });
    state.meta = {
      op: 'cache',
      cached: status === 'hit',
      status,
      key,
    };
    emitStep(collector, state);
  };

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
    value: Store.StoreValue | undefined,
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
  const inFlight = new Map<string, Promise<Store.StoreValue | undefined>>();

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

    async get(key: string): Promise<Store.StoreValue | undefined> {
      const ns = prefixed(key);
      const stored = await cacheStore.get(ns);
      const envelope = readCacheEnvelope(stored);
      if (envelope !== undefined) {
        if ('expired' in envelope) {
          // Expired entry: best-effort purge from the cache tier, then fall
          // through to the backing as a MISS. A throwing delete must not
          // surface to the caller; a stale entry serving until the next read
          // is acceptable.
          try {
            await cacheStore.delete(ns);
          } catch (error) {
            warnCacheFailure('delete', key, error);
          }
        } else {
          counters.hits++;
          reportCacheStatus(key, 'hit');
          return envelope.value;
        }
      }

      // Single-flight: if another caller is already fetching this key, join
      // their Promise rather than starting a second backing call.
      const existing = inFlight.get(ns);
      if (existing) {
        counters.inflight_dedups++;
        reportCacheStatus(key, 'hit');
        return existing;
      }

      // This caller drives the backing fetch — count the MISS once here so
      // joined callers above are not double-counted as misses too.
      counters.misses++;
      reportCacheStatus(key, 'miss');

      const promise = (async () => {
        try {
          const value = await backing.get(key);
          if (value === undefined) return undefined;

          const rule = findMatchingRule(key, value);
          if (rule) {
            // Best-effort cache populate. Mirrors the write-path
            // policy: backing has already returned, so a throwing cache layer
            // must not surface as an unhandled rejection on the shared
            // Promise that other concurrent callers are awaiting.
            try {
              // `cache.ttl` is documented in seconds; the envelope `exp` and
              // the TTL-native eviction hint both want ms. Multiply once at the
              // boundary to keep the rest of the pipeline consistent with
              // EventCache semantics. Dual-write: the `{value, exp}` envelope
              // is authoritative for expiry (every backing tier honors it),
              // and the `ttl` arg lets a TTL-native tier (`__cache`, Redis)
              // proactively evict.
              const ttlMs = rule.ttl * 1000;
              await cacheStore.set(ns, wrapCacheEnvelope(value, ttlMs), ttlMs);
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

    async set(
      key: string,
      value: Store.StoreValue,
      ttl?: number,
    ): Promise<void> {
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
      // the advisory layer. Same dual-write as the read-path populate: store
      // the `{value, exp}` envelope and pass the `ttl` eviction hint.
      try {
        const ttlMs = rule.ttl * 1000;
        await cacheStore.set(
          prefixed(key),
          wrapCacheEnvelope(value, ttlMs),
          ttlMs,
        );
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
