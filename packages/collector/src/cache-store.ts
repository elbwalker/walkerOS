import type { Store } from '@walkeros/core';

/**
 * Options for the built-in collector cache store (`__cache`).
 *
 * The default cache is an entry-capped LRU with active TTL sweep. Byte-size
 * accounting is opt-in: when `maxSize` is `undefined`, no byte budget is
 * enforced.
 */
export interface CacheStoreOptions {
  /** Hard cap on entries. Defaults to 10000. */
  maxEntries?: number;
  /**
   * Optional byte budget for the cache. When set, byte-sized eviction is
   * enabled in addition to entry-count eviction. Defaults to `undefined`
   * (no byte budget).
   */
  maxSize?: number;
  /**
   * Active sweep interval (ms) for purging expired entries even when they
   * are never read. Defaults to 60_000 (60 seconds). Pass 0 to disable.
   */
  sweepIntervalMs?: number;
  /**
   * Fraction of `maxEntries` to keep after a batched eviction pass. Defaults
   * to 0.8. The cache trims to `maxEntries * lowWaterMark` in one pass on
   * overflow.
   */
  lowWaterMark?: number;
}

/**
 * Operational counters exposed by the cache store. All counters are
 * monotonic for the lifetime of the cache instance.
 */
export interface CacheStoreCounters {
  /** Successful `get` calls that returned a live cached value. */
  hits: number;
  /** `get` calls that found no entry (cold) or only an expired one. */
  misses: number;
  /** `set` calls that created a new key (first-time population). */
  populates: number;
  /** All `set` calls (populates + overwrites). */
  writes: number;
  /** All `delete` calls that removed an existing key. */
  deletes: number;
  /** Entries removed because the cache hit `maxEntries`. */
  evictions_entries: number;
  /** Entries removed because their TTL expired (sweep or lazy). */
  evictions_ttl: number;
}

interface CacheEntry {
  value: unknown;
  expires?: number;
}

/**
 * The upgraded `__cache` store. Backward-compatible with the existing
 * `Store.Instance` shape — callers see `get(key)`, `set(key, value, ttl?)`,
 * `delete(key)`. Adds an observability surface via `counters` and an active
 * TTL sweep that runs on a timer.
 *
 * Eviction model:
 * - Map iteration order is insertion order; oldest insertion is the FIFO head.
 * - `get` reorders the entry to most-recently-used (delete + re-insert).
 * - On insert overflow (size > maxEntries), evict in one pass down to
 *   `lowWaterMark * maxEntries` (default 80%).
 *
 * Active TTL sweep: every `sweepIntervalMs` ms, walk the map and drop any
 * entries past `expires`. The interval is cleared in `destroy()`.
 */
export type CacheStore = Store.Instance & {
  readonly counters: CacheStoreCounters;
  destroy: () => void;
};

const DEFAULT_MAX_ENTRIES = 10000;
const DEFAULT_SWEEP_INTERVAL_MS = 60_000;
const DEFAULT_LOW_WATER_MARK = 0.8;

export function createCacheStore(options: CacheStoreOptions = {}): CacheStore {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const lowWaterMark = options.lowWaterMark ?? DEFAULT_LOW_WATER_MARK;
  const sweepIntervalMs = options.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
  const targetSize = Math.floor(maxEntries * lowWaterMark);

  const entries = new Map<string, CacheEntry>();

  const counters: CacheStoreCounters = {
    hits: 0,
    misses: 0,
    populates: 0,
    writes: 0,
    deletes: 0,
    evictions_entries: 0,
    evictions_ttl: 0,
  };

  function evictOverflow(): void {
    if (entries.size <= maxEntries) return;
    // Trim in one pass down to targetSize using insertion-order iteration
    // (oldest first). LRU is preserved because `get` re-inserts on access.
    const toRemove = entries.size - targetSize;
    let removed = 0;
    for (const key of entries.keys()) {
      if (removed >= toRemove) break;
      entries.delete(key);
      removed++;
    }
    counters.evictions_entries += removed;
  }

  function sweep(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of entries) {
      if (entry.expires !== undefined && entry.expires <= now) {
        entries.delete(key);
        removed++;
      }
    }
    counters.evictions_ttl += removed;
  }

  let sweepTimer: ReturnType<typeof setInterval> | undefined;
  if (sweepIntervalMs > 0) {
    sweepTimer = setInterval(sweep, sweepIntervalMs);
    // Don't keep the Node.js event loop alive solely for the cache sweep.
    if (
      sweepTimer &&
      typeof (sweepTimer as { unref?: () => void }).unref === 'function'
    ) {
      (sweepTimer as { unref: () => void }).unref();
    }
  }

  const store: CacheStore = {
    type: 'memory',
    config: {},

    get(key: string): unknown {
      const entry = entries.get(key);
      if (!entry) {
        counters.misses++;
        return undefined;
      }

      if (entry.expires !== undefined && entry.expires <= Date.now()) {
        entries.delete(key);
        counters.evictions_ttl++;
        counters.misses++;
        return undefined;
      }

      // LRU: move to most-recently-used position.
      entries.delete(key);
      entries.set(key, entry);
      counters.hits++;
      return entry.value;
    },

    set(key: string, value: unknown, ttl?: number): void {
      const isNew = !entries.has(key);
      // Always delete first so re-insert puts the entry at the
      // most-recently-used position regardless of overwrite or new.
      if (!isNew) entries.delete(key);

      entries.set(key, {
        value,
        expires: ttl !== undefined ? Date.now() + ttl : undefined,
      });

      counters.writes++;
      if (isNew) counters.populates++;

      if (entries.size > maxEntries) evictOverflow();
    },

    delete(key: string): void {
      if (entries.delete(key)) counters.deletes++;
    },

    get counters() {
      // Return a snapshot so external callers can't mutate internal state.
      return { ...counters };
    },

    destroy(): void {
      if (sweepTimer !== undefined) {
        clearInterval(sweepTimer);
        sweepTimer = undefined;
      }
      entries.clear();
    },
  };

  return store;
}
