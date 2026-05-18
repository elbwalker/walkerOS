import type { Cache, Logger, Store } from '@walkeros/core';
import { createCacheStore } from '../cache-store';
import { wrapStoreWithCache } from '../store-cache-wrapper';

interface MockLogger extends Logger.Instance {
  error: jest.Mock;
  warn: jest.Mock;
  info: jest.Mock;
  debug: jest.Mock;
  json: jest.Mock;
  scope: jest.Mock;
}

/**
 * Build a stub `Logger.Instance` whose `warn` and other methods are jest mocks.
 * `scope` returns the same instance so chained scoping does not change the spy
 * surface — tests assert on `warn` directly. `throw` is typed via a function
 * that always throws so the `never` return type is honored.
 */
function createMockLogger(): MockLogger {
  const throwFn: Logger.Instance['throw'] = (message) => {
    throw message instanceof Error ? message : new Error(String(message));
  };

  const instance: MockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    throw: throwFn,
    json: jest.fn(),
    scope: jest.fn(),
  };
  instance.scope.mockReturnValue(instance);
  return instance;
}

/**
 * Build a minimal `Store.Instance` backed by a Map. Captures call counts so
 * tests can assert pass-through versus cache-hit behavior. Synchronous get/set
 * is fine — the `Store.Instance` interface allows both sync and async returns.
 */
function createBackingStore(): Store.Instance & {
  calls: { get: number; set: number; delete: number };
  data: Map<string, unknown>;
} {
  const data = new Map<string, unknown>();
  const calls = { get: 0, set: 0, delete: 0 };
  return {
    type: 'test-backing',
    config: {},
    data,
    calls,
    get(key: string) {
      calls.get++;
      return data.get(key);
    },
    set(key: string, value: unknown) {
      calls.set++;
      data.set(key, value);
    },
    delete(key: string) {
      calls.delete++;
      data.delete(key);
    },
  };
}

describe('store-cache wrapper: read path', () => {
  it('cache HIT: returns cached value without calling backing.get', async () => {
    const backing = createBackingStore();
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [{ ttl: 60 }],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      // Prime the cache via a first read (backing returns the seeded value).
      backing.data.set('user', 'alice');
      const first = await wrapped.get('user');
      expect(first).toBe('alice');
      expect(backing.calls.get).toBe(1);

      // Second read should be a cache HIT — no additional backing.get call.
      const second = await wrapped.get('user');
      expect(second).toBe('alice');
      expect(backing.calls.get).toBe(1);
    } finally {
      cacheStore.destroy();
    }
  });

  it('cache MISS: calls backing.get, returns its value, populates cache with rule TTL', async () => {
    const backing = createBackingStore();
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [{ ttl: 60 }],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      backing.data.set('user', 'alice');
      const value = await wrapped.get('user');
      expect(value).toBe('alice');
      expect(backing.calls.get).toBe(1);

      // The cache layer should now hold the value under the namespaced key.
      // ttl=60s, cacheStore stores ms internally.
      expect(cacheStore.get('foo:user')).toBe('alice');
    } finally {
      cacheStore.destroy();
    }
  });

  it('cache MISS where backing returns undefined: returns undefined, does NOT populate cache (no negative caching)', async () => {
    const backing = createBackingStore();
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [{ ttl: 60 }],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      const value = await wrapped.get('missing');
      expect(value).toBeUndefined();
      // The cache must not have populated.
      expect(cacheStore.get('foo:missing')).toBeUndefined();
      // A second read goes back to backing (still no negative cache).
      const second = await wrapped.get('missing');
      expect(second).toBeUndefined();
      expect(backing.calls.get).toBe(2);
    } finally {
      cacheStore.destroy();
    }
  });

  it('cache MISS where no rule matches: returns from backing but does NOT populate', async () => {
    const backing = createBackingStore();
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [
          {
            match: { key: 'key', operator: 'prefix', value: 'user:' },
            ttl: 60,
          },
        ],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      backing.data.set('account:42', { id: 42 });
      const value = await wrapped.get('account:42');
      expect(value).toEqual({ id: 42 });
      // No rule matched — backing.get ran, but cache did not populate.
      expect(cacheStore.get('foo:account:42')).toBeUndefined();

      // Confirm second call still hits backing (no cache).
      await wrapped.get('account:42');
      expect(backing.calls.get).toBe(2);
    } finally {
      cacheStore.destroy();
    }
  });

  it('cache MISS where rule.match filters by key prefix: only matching keys populate', async () => {
    const backing = createBackingStore();
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [
          {
            match: { key: 'key', operator: 'prefix', value: 'user:' },
            ttl: 60,
          },
        ],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      backing.data.set('user:alice', { id: 'alice' });
      backing.data.set('account:42', { id: 42 });

      const userVal = await wrapped.get('user:alice');
      expect(userVal).toEqual({ id: 'alice' });
      expect(cacheStore.get('foo:user:alice')).toEqual({ id: 'alice' });

      const accountVal = await wrapped.get('account:42');
      expect(accountVal).toEqual({ id: 42 });
      // Non-matching key did not populate the cache.
      expect(cacheStore.get('foo:account:42')).toBeUndefined();
    } finally {
      cacheStore.destroy();
    }
  });
});

/**
 * Build a `Store.Instance`-shaped cache layer whose `set` and `delete`
 * implementations are jest mocks so tests can simulate cache-layer failures
 * (backing succeeded, cache rejected) and assert that wrapper behavior matches
 * the "cache is advisory" policy from the design doc.
 */
function createMockCacheStore(): Store.Instance & {
  store: Map<string, unknown>;
  get: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
} {
  const store = new Map<string, unknown>();
  const get = jest.fn((key: string) => store.get(key));
  const set = jest.fn((key: string, value: unknown) => {
    store.set(key, value);
  });
  const del = jest.fn((key: string) => {
    store.delete(key);
  });
  return {
    type: 'mock-cache',
    config: {},
    store,
    get,
    set,
    delete: del,
  };
}

describe('store-cache wrapper: write path', () => {
  it('set: writes to backing then to cache', async () => {
    const backing = createBackingStore();
    const cacheStore = createMockCacheStore();
    const logger = createMockLogger();
    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };
    const wrapped = wrapStoreWithCache(backing, {
      storeId: 'foo',
      cacheConfig,
      cacheStore,
      namespace: 'foo',
      logger,
    });

    await wrapped.set('user', 'alice');

    expect(backing.calls.set).toBe(1);
    expect(backing.data.get('user')).toBe('alice');
    expect(cacheStore.set).toHaveBeenCalledTimes(1);
    expect(cacheStore.set).toHaveBeenCalledWith('foo:user', 'alice', 60 * 1000);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('set: backing throws -> wrapper throws, cache NOT called', async () => {
    const backing = createBackingStore();
    const cacheStore = createMockCacheStore();
    const logger = createMockLogger();
    const failure = new Error('backing offline');
    backing.set = jest.fn(() => {
      throw failure;
    });

    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };
    const wrapped = wrapStoreWithCache(backing, {
      storeId: 'foo',
      cacheConfig,
      cacheStore,
      namespace: 'foo',
      logger,
    });

    await expect(wrapped.set('user', 'alice')).rejects.toBe(failure);
    expect(cacheStore.set).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('set: cache throws -> wrapper returns success, warning logged', async () => {
    const backing = createBackingStore();
    const cacheStore = createMockCacheStore();
    const logger = createMockLogger();
    cacheStore.set.mockImplementationOnce(() => {
      throw new Error('cache offline');
    });

    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };
    const wrapped = wrapStoreWithCache(backing, {
      storeId: 'foo',
      cacheConfig,
      cacheStore,
      namespace: 'foo',
      logger,
    });

    // Wrapper must not throw — cache failure degrades performance, not
    // correctness. Backing still recorded the write.
    await expect(wrapped.set('user', 'alice')).resolves.toBeUndefined();
    expect(backing.calls.set).toBe(1);
    expect(backing.data.get('user')).toBe('alice');
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('set: no matching rule -> backing called, cache NOT called', async () => {
    const backing = createBackingStore();
    const cacheStore = createMockCacheStore();
    const logger = createMockLogger();
    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [
        {
          match: { key: 'key', operator: 'prefix', value: 'user:' },
          ttl: 60,
        },
      ],
    };
    const wrapped = wrapStoreWithCache(backing, {
      storeId: 'foo',
      cacheConfig,
      cacheStore,
      namespace: 'foo',
      logger,
    });

    await wrapped.set('account:42', { id: 42 });

    expect(backing.calls.set).toBe(1);
    expect(backing.data.get('account:42')).toEqual({ id: 42 });
    // No rule matched the key — cache must not have been populated.
    expect(cacheStore.set).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('delete: deletes from backing then cache', async () => {
    const backing = createBackingStore();
    const cacheStore = createMockCacheStore();
    const logger = createMockLogger();
    backing.data.set('user', 'alice');
    cacheStore.store.set('foo:user', 'alice');

    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };
    const wrapped = wrapStoreWithCache(backing, {
      storeId: 'foo',
      cacheConfig,
      cacheStore,
      namespace: 'foo',
      logger,
    });

    await wrapped.delete('user');

    expect(backing.calls.delete).toBe(1);
    expect(backing.data.has('user')).toBe(false);
    expect(cacheStore.delete).toHaveBeenCalledTimes(1);
    expect(cacheStore.delete).toHaveBeenCalledWith('foo:user');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('delete: backing throws -> wrapper throws, cache NOT called', async () => {
    const backing = createBackingStore();
    const cacheStore = createMockCacheStore();
    const logger = createMockLogger();
    const failure = new Error('backing offline');
    backing.delete = jest.fn(() => {
      throw failure;
    });

    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };
    const wrapped = wrapStoreWithCache(backing, {
      storeId: 'foo',
      cacheConfig,
      cacheStore,
      namespace: 'foo',
      logger,
    });

    await expect(wrapped.delete('user')).rejects.toBe(failure);
    expect(cacheStore.delete).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('delete: cache throws -> wrapper returns success, warning logged', async () => {
    const backing = createBackingStore();
    const cacheStore = createMockCacheStore();
    const logger = createMockLogger();
    backing.data.set('user', 'alice');
    cacheStore.delete.mockImplementationOnce(() => {
      throw new Error('cache offline');
    });

    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };
    const wrapped = wrapStoreWithCache(backing, {
      storeId: 'foo',
      cacheConfig,
      cacheStore,
      namespace: 'foo',
      logger,
    });

    await expect(wrapped.delete('user')).resolves.toBeUndefined();
    expect(backing.calls.delete).toBe(1);
    expect(backing.data.has('user')).toBe(false);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});

/**
 * Build a `Store.Instance` whose `get` implementation is fully controlled by
 * the caller. Used by the single-flight tests to model slow / failing backings
 * without coupling to the Map-backed default. `set` and `delete` are no-ops
 * because the dedup mechanism only applies to reads.
 */
function createControlledBackingStore(
  getImpl: jest.Mock,
): Store.Instance & { get: jest.Mock } {
  return {
    type: 'controlled-backing',
    config: {},
    get: getImpl,
    set: jest.fn(),
    delete: jest.fn(),
  };
}

describe('store-cache wrapper: single-flight', () => {
  beforeEach(() => {
    // The shared `web.setup.mjs` enables fake timers in every `beforeEach`.
    // These tests rely on a real macrotask delay (setTimeout) inside the
    // backing mock to overlap concurrent gets — fake timers would deadlock
    // the awaits. Opt back into real timers for this suite only.
    jest.useRealTimers();
  });

  it('N concurrent gets on the same key dedupe to one backing call', async () => {
    // Make backing.get slow so all 50 callers arrive before the first resolves.
    // If dedup is missing, every caller fires an independent backing.get.
    const backingGet = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('v'), 10);
        }),
    );
    const backing = createControlledBackingStore(backingGet);
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [{ ttl: 60 }],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      const results = await Promise.all(
        Array.from({ length: 50 }, () => wrapped.get('k')),
      );

      expect(results).toHaveLength(50);
      expect(results.every((r) => r === 'v')).toBe(true);
      expect(backingGet).toHaveBeenCalledTimes(1);
    } finally {
      cacheStore.destroy();
    }
  });

  it('after in-flight resolves, next get is a fresh cycle (cache HIT, no backing call)', async () => {
    // After the in-flight promise settles, the cache holds the populated value
    // and the registry slot has been released. The next get must HIT the cache
    // — not the freed slot, not the backing.
    const backingGet = jest.fn().mockResolvedValue('v');
    const backing = createControlledBackingStore(backingGet);
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [{ ttl: 60 }],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      const first = await wrapped.get('k');
      expect(first).toBe('v');
      expect(backingGet).toHaveBeenCalledTimes(1);

      const second = await wrapped.get('k');
      expect(second).toBe('v');
      // Second call hit the populated cache — backing must not be called again.
      expect(backingGet).toHaveBeenCalledTimes(1);
    } finally {
      cacheStore.destroy();
    }
  });

  it('after in-flight rejects, registry is cleared (next get retries backing)', async () => {
    // `finally` must run on rejection too, otherwise a transient backing
    // failure would freeze the key forever behind a dead Promise.
    const backingGet = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('v');
    const backing = createControlledBackingStore(backingGet);
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [{ ttl: 60 }],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      await expect(wrapped.get('k')).rejects.toThrow('transient');
      // Registry must be cleared — the next get retries the backing instead
      // of returning the failed Promise.
      const value = await wrapped.get('k');
      expect(value).toBe('v');
      expect(backingGet).toHaveBeenCalledTimes(2);
    } finally {
      cacheStore.destroy();
    }
  });

  it('different keys do not share in-flight slots', async () => {
    // Registry is keyed by namespaced key. Concurrent gets on distinct keys
    // must each fire their own backing call.
    const backingGet = jest.fn().mockImplementation(
      (key: string) =>
        new Promise((resolve) => {
          setTimeout(() => resolve(`v:${key}`), 10);
        }),
    );
    const backing = createControlledBackingStore(backingGet);
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [{ ttl: 60 }],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      const [a, b] = await Promise.all([wrapped.get('a'), wrapped.get('b')]);
      expect(a).toBe('v:a');
      expect(b).toBe('v:b');
      expect(backingGet).toHaveBeenCalledTimes(2);
    } finally {
      cacheStore.destroy();
    }
  });
});

describe('store-cache wrapper: counters', () => {
  beforeEach(() => {
    // Some tests below stage overlapping gets to exercise the in-flight dedup
    // counter; fake timers (enabled by the shared `web.setup.mjs`) would
    // deadlock the awaits, so opt into real timers for this suite.
    jest.useRealTimers();
  });

  it('hits/misses increment correctly', async () => {
    const backing = createBackingStore();
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [{ ttl: 60 }],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      backing.data.set('user', 'alice');
      // First read is a MISS — backing returns a value and the cache populates.
      await wrapped.get('user');
      expect(wrapped.counters.misses).toBe(1);
      expect(wrapped.counters.hits).toBe(0);

      // Second read finds the populated cache entry — HIT.
      await wrapped.get('user');
      expect(wrapped.counters.hits).toBe(1);
      expect(wrapped.counters.misses).toBe(1);

      // Third read of a different key also misses (backing returns undefined,
      // so no populate, but the MISS counter still increments).
      await wrapped.get('missing');
      expect(wrapped.counters.misses).toBe(2);
      expect(wrapped.counters.hits).toBe(1);
    } finally {
      cacheStore.destroy();
    }
  });

  it('populates counts only cache-fills after backing MISS that returned a value', async () => {
    const backing = createBackingStore();
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [
          {
            match: { key: 'key', operator: 'prefix', value: 'user:' },
            ttl: 60,
          },
        ],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      // MISS + backing returns value + rule matches → populate.
      backing.data.set('user:alice', { id: 'alice' });
      await wrapped.get('user:alice');
      expect(wrapped.counters.populates).toBe(1);

      // MISS + backing returns value + rule does NOT match → no populate.
      backing.data.set('account:42', { id: 42 });
      await wrapped.get('account:42');
      expect(wrapped.counters.populates).toBe(1);

      // MISS + backing returns undefined → no populate.
      await wrapped.get('user:missing');
      expect(wrapped.counters.populates).toBe(1);

      // HIT on the previously populated key → no populate.
      await wrapped.get('user:alice');
      expect(wrapped.counters.populates).toBe(1);
    } finally {
      cacheStore.destroy();
    }
  });

  it('writes counts every set, deletes counts every delete', async () => {
    const backing = createBackingStore();
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [
          {
            match: { key: 'key', operator: 'prefix', value: 'user:' },
            ttl: 60,
          },
        ],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      // Every set increments `writes` regardless of whether a rule matches.
      await wrapped.set('user:alice', { id: 'alice' });
      await wrapped.set('account:42', { id: 42 });
      expect(wrapped.counters.writes).toBe(2);

      // Every delete increments `deletes`.
      await wrapped.delete('user:alice');
      await wrapped.delete('account:42');
      await wrapped.delete('missing');
      expect(wrapped.counters.deletes).toBe(3);

      // Sanity: counters track distinct paths.
      expect(wrapped.counters.hits).toBe(0);
      expect(wrapped.counters.misses).toBe(0);
    } finally {
      cacheStore.destroy();
    }
  });

  it('inflight_dedups counts joined in-flight promises', async () => {
    // 50 concurrent gets on the same key → 1 backing call + 49 dedups.
    const backingGet = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('v'), 10);
        }),
    );
    const backing = createControlledBackingStore(backingGet);
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [{ ttl: 60 }],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      await Promise.all(Array.from({ length: 50 }, () => wrapped.get('k')));

      // One caller drove the MISS; the other 49 joined the in-flight Promise.
      expect(backingGet).toHaveBeenCalledTimes(1);
      expect(wrapped.counters.misses).toBe(1);
      expect(wrapped.counters.inflight_dedups).toBe(49);
    } finally {
      cacheStore.destroy();
    }
  });

  it('counters readable via wrapped.counters with snapshot semantics', async () => {
    const backing = createBackingStore();
    const cacheStore = createCacheStore();
    try {
      const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
        rules: [{ ttl: 60 }],
      };
      const wrapped = wrapStoreWithCache(backing, {
        storeId: 'foo',
        cacheConfig,
        cacheStore,
        namespace: 'foo',
      });

      backing.data.set('user', 'alice');
      await wrapped.get('user');

      // Snapshot semantics: reading `counters` returns a fresh copy each time.
      // Mutating the returned object must not affect internal state, so a
      // subsequent read reports the unchanged internal counter.
      const snapshot = wrapped.counters;
      expect(snapshot.misses).toBe(1);
      snapshot.misses = 999;
      expect(wrapped.counters.misses).toBe(1);

      // All counter keys are present and numeric on a fresh wrapper.
      const fresh = wrapStoreWithCache(createBackingStore(), {
        storeId: 'bar',
        cacheConfig,
        cacheStore,
        namespace: 'bar',
      });
      expect(fresh.counters).toEqual({
        hits: 0,
        misses: 0,
        populates: 0,
        writes: 0,
        deletes: 0,
        inflight_dedups: 0,
      });
    } finally {
      cacheStore.destroy();
    }
  });
});
