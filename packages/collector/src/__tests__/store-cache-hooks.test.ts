import type { Cache, Collector, Store } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { initStores } from '../store';

/**
 * Minimal collector instance for store init. Tests assign `hooks` after
 * construction (or replace with a fresh object) so each case is independent.
 */
function createMockCollector(): Collector.Instance {
  return {
    logger: createMockLogger(),
    stores: {},
    hooks: {},
    observers: new Set(),
    status: {
      startedAt: 0,
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations: {},
      dropped: {},
    },
  } as unknown as Collector.Instance;
}

/**
 * Build a backing `Store.Init` whose returned instance is Map-backed and
 * exposes call counters so tests can verify whether the hook fired before or
 * after the cache wrapper resolved a HIT.
 */
function createBackingInit(): {
  init: Store.Init;
  data: Map<string, unknown>;
  calls: { get: number; set: number; delete: number };
} {
  const data = new Map<string, unknown>();
  const calls = { get: 0, set: 0, delete: 0 };
  const init: Store.Init = (context) => ({
    type: 'backing',
    config: context.config as Store.Config,
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
  });
  return { init, data, calls };
}

describe('store-cache: hooks compose with wrapper', () => {
  it('hook intercepts wrapped.get on HIT and MISS at the boundary', async () => {
    const collector = createMockCollector();
    const preStoreGet = jest.fn(({ fn }, key) => fn(key));
    collector.hooks = { preStoreGet } as Collector.Instance['hooks'];

    const { init, data, calls } = createBackingInit();

    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };

    const stores = await initStores(collector, {
      api: {
        code: init,
        cache: cacheConfig,
      } as Store.InitStore,
    });

    // First read: cache MISS — backing.get fires.
    data.set('user', 'alice');
    const first = await stores.api.get('user');
    expect(first).toBe('alice');
    expect(calls.get).toBe(1);
    // Hook must have fired once at the consumer boundary.
    expect(preStoreGet).toHaveBeenCalledTimes(1);

    // Second read: cache HIT — backing.get must NOT fire, but the hook MUST
    // fire because the consumer-facing boundary still ran.
    const second = await stores.api.get('user');
    expect(second).toBe('alice');
    expect(calls.get).toBe(1);
    expect(preStoreGet).toHaveBeenCalledTimes(2);
  });

  it('hook fires once per consumer get (not twice from wrapper + backing)', async () => {
    const collector = createMockCollector();
    const preStoreGet = jest.fn(({ fn }, key) => fn(key));
    collector.hooks = { preStoreGet } as Collector.Instance['hooks'];

    const { init, data } = createBackingInit();

    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };

    const stores = await initStores(collector, {
      api: {
        code: init,
        cache: cacheConfig,
      } as Store.InitStore,
    });

    data.set('user', 'alice');
    await stores.api.get('user');
    // Exactly one hook call per consumer get: hook wraps the wrapper, not the
    // bare backing. Double-firing here would indicate hooks were installed on
    // both layers.
    expect(preStoreGet).toHaveBeenCalledTimes(1);
  });

  it('postStoreGet sees the cached value on HIT', async () => {
    const collector = createMockCollector();
    const postStoreGet = jest.fn(({ result }) => result);
    collector.hooks = { postStoreGet } as Collector.Instance['hooks'];

    const { init, data } = createBackingInit();

    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };

    const stores = await initStores(collector, {
      api: {
        code: init,
        cache: cacheConfig,
      } as Store.InitStore,
    });

    data.set('user', 'alice');
    await stores.api.get('user');
    // HIT path — postStoreGet must fire even when the backing was not
    // called. `useHooks` is synchronous: it observes whatever the wrapped
    // function returned (a Promise here), so callers must `await` the
    // recorded `result` to inspect the resolved value.
    const hit = await stores.api.get('user');
    expect(hit).toBe('alice');
    expect(postStoreGet).toHaveBeenCalledTimes(2);
    const lastResult = await postStoreGet.mock.calls[1][0].result;
    expect(lastResult).toBe('alice');
  });

  it('hook on storeSet fires once per wrapped.set at the boundary', async () => {
    const collector = createMockCollector();
    const preStoreSet = jest.fn(({ fn }, key, value, ttl) =>
      fn(key, value, ttl),
    );
    collector.hooks = { preStoreSet } as Collector.Instance['hooks'];

    const { init, data, calls } = createBackingInit();

    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };

    const stores = await initStores(collector, {
      api: {
        code: init,
        cache: cacheConfig,
      } as Store.InitStore,
    });

    await stores.api.set('user', 'alice');

    // Backing recorded the write.
    expect(calls.set).toBe(1);
    expect(data.get('user')).toBe('alice');
    // Hook fired exactly once at the consumer-facing wrapper boundary —
    // not also when the wrapper internally writes into cacheStore.
    expect(preStoreSet).toHaveBeenCalledTimes(1);
  });

  it('hook is NOT called on internal cache-side writes', async () => {
    // When the wrapper populates the internal cacheStore (memory) after a
    // backing MISS, the hook must NOT fire for that internal cacheStore.set —
    // only the consumer-facing wrapped.set should be intercepted.
    const collector = createMockCollector();
    const preStoreSet = jest.fn(({ fn }, key, value, ttl) =>
      fn(key, value, ttl),
    );
    collector.hooks = { preStoreSet } as Collector.Instance['hooks'];

    const { init, data } = createBackingInit();

    const cacheConfig: Cache.Cache<Cache.StoreCacheRule> = {
      rules: [{ ttl: 60 }],
    };

    const stores = await initStores(collector, {
      api: {
        code: init,
        cache: cacheConfig,
      } as Store.InitStore,
    });

    // Trigger a backing MISS; the wrapper will write into the internal
    // __cache store as a side effect. The hook must NOT fire for that
    // internal write.
    data.set('user', 'alice');
    await stores.api.get('user');

    expect(preStoreSet).not.toHaveBeenCalled();
  });

  it('stores without a cache wrapper still have hooks installed (bare backing observable)', async () => {
    // Stores that opt out of cache wrapping must still be hook-wrapped so
    // the collector retains the legacy observability contract.
    const collector = createMockCollector();
    const preStoreGet = jest.fn(({ fn }, key) => fn(key));
    collector.hooks = { preStoreGet } as Collector.Instance['hooks'];

    const { init, data } = createBackingInit();

    const stores = await initStores(collector, {
      bare: { code: init },
    });

    data.set('key', 'v');
    const value = await stores.bare.get('key');
    expect(value).toBe('v');
    expect(preStoreGet).toHaveBeenCalledTimes(1);
  });
});
