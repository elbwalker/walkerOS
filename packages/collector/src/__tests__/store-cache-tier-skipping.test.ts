import type { Collector, Store } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { initStores } from '../store';

/**
 * Integration test for 3-tier recursive store-cache composition.
 *
 * Layout under test (caller wires `$store.api`):
 *
 *   wrapped-api      ←  cache.store = redis
 *     wrapped-redis  ←  cache.store = memory
 *       memory       ←  no cache (terminal / bare in-memory layer)
 *
 * The phase 2 init in `store.ts` walks the `cache.store` graph in topological
 * order (terminals first) and replaces `result[storeId]` with a wrapped
 * instance. The wrapper's `cacheStore` resolves against the in-progress
 * `result` map, which means: when `api` is wrapped, the `redis` entry has
 * already been replaced with the wrapped redis instance. That referential
 * identity is what makes tier-skipping repopulation automatic — a get on the
 * outer api delegates to the wrapped redis (which itself probes memory before
 * its own backing), and a get on the wrapped redis populates the memory layer
 * via the same code path that any other wrapped store would use.
 */

interface MockCollectorWithStores extends Collector.Instance {
  stores: Store.Stores;
}

function createMockCollector(): MockCollectorWithStores {
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
  } as unknown as MockCollectorWithStores;
}

interface TrackedBacking {
  data: Map<string, unknown>;
  get: jest.Mock<unknown, [string]>;
  set: jest.Mock<void, [string, unknown, number | undefined]>;
  delete: jest.Mock<void, [string]>;
}

/**
 * Create a deferred record of `{ backing, init }`. The backing's data map and
 * jest mocks are captured at module scope so the test body can assert on call
 * counts after `initStores` runs. Returning the backing alongside the init
 * keeps the closure unambiguous — there is exactly one Map per layer, and the
 * Init function returns a `Store.Instance` whose methods read/write that Map.
 *
 * Note: `applyStoreHooks` in `store.ts` reassigns `instance.get/set/delete`
 * after phase 1. The wrappers it installs call the originals captured here, so
 * the jest mocks still record every call — they sit at the bottom of the
 * wrap stack (hook wrapper → cache wrapper → these jest mocks).
 */
function createTrackedStoreLayer(typeName: string): {
  backing: TrackedBacking;
  init: Store.Init;
} {
  const data = new Map<string, unknown>();
  const get = jest.fn<unknown, [string]>((key: string) => data.get(key));
  const set = jest.fn<void, [string, unknown, number | undefined]>(
    (key: string, value: unknown) => {
      data.set(key, value);
    },
  );
  const del = jest.fn<void, [string]>((key: string) => {
    data.delete(key);
  });
  const backing: TrackedBacking = { data, get, set, delete: del };
  const init: Store.Init = () => ({
    type: typeName,
    config: {},
    get,
    set,
    delete: del,
  });
  return { backing, init };
}

describe('store-cache: 3-tier recursive composition', () => {
  it('memory MISS, redis HIT → memory repopulates, api never touched', async () => {
    const collector = createMockCollector();
    const memory = createTrackedStoreLayer('memory-mock');
    const redis = createTrackedStoreLayer('redis-mock');
    const api = createTrackedStoreLayer('api-mock');

    // Pre-populate redis-mock backing only. Note the key shape: the wrapper
    // forwards `prefixed(key)` to its `cacheStore`, so when wrapped-api probes
    // wrapped-redis with the user key `K`, wrapped-redis (and its backing)
    // receives `api:K` — the api wrapper's namespace prefix. The bare backing
    // therefore stores `api:K`, not `K`. (`namespace` defaults to `storeId`.)
    redis.backing.data.set('api:K', 'V_from_redis');

    const stores = await initStores(collector, {
      api: {
        code: api.init,
        cache: { store: 'redis', rules: [{ ttl: 86400 }] },
      } as Store.InitStore,
      redis: {
        code: redis.init,
        cache: { store: 'memory', rules: [{ ttl: 300 }] },
      } as Store.InitStore,
      memory: { code: memory.init } as Store.InitStore,
    });

    // First call: cold cache. Expect memory MISS, redis HIT, api never called.
    const first = await stores.api.get('K');
    expect(first).toBe('V_from_redis');
    expect(api.backing.get).toHaveBeenCalledTimes(0);
    expect(redis.backing.get).toHaveBeenCalledTimes(1);
    // wrapped-redis populates its own cache layer (memory) on a backing hit,
    // using its `redis:` namespace prefix on top of the already-prefixed key
    // it received from wrapped-api. So memory ends up with `redis:api:K`.
    expect(memory.backing.data.get('redis:api:K')).toBe('V_from_redis');

    // Second call: memory now has the value. Expect zero new backing calls.
    api.backing.get.mockClear();
    redis.backing.get.mockClear();
    const memoryGetCallsBefore = memory.backing.get.mock.calls.length;

    const second = await stores.api.get('K');
    expect(second).toBe('V_from_redis');
    expect(api.backing.get).toHaveBeenCalledTimes(0);
    expect(redis.backing.get).toHaveBeenCalledTimes(0);
    // memory.get is called exactly once on the second pass — wrapped-redis's
    // outer cache probe for `redis:api:K` hits and short-circuits before its
    // own backing is consulted. (If memory.get were called more than once,
    // tier-skipping is broken.)
    expect(memory.backing.get.mock.calls.length).toBe(memoryGetCallsBefore + 1);
  });

  it('memory MISS, redis MISS, api HIT → both intermediate tiers populate', async () => {
    const collector = createMockCollector();
    const memory = createTrackedStoreLayer('memory-mock');
    const redis = createTrackedStoreLayer('redis-mock');
    const api = createTrackedStoreLayer('api-mock');

    // Pre-populate only the terminal source-of-truth.
    api.backing.data.set('K', 'V_from_api');

    const stores = await initStores(collector, {
      api: {
        code: api.init,
        cache: { store: 'redis', rules: [{ ttl: 86400 }] },
      } as Store.InitStore,
      redis: {
        code: redis.init,
        cache: { store: 'memory', rules: [{ ttl: 300 }] },
      } as Store.InitStore,
      memory: { code: memory.init } as Store.InitStore,
    });

    // Cold pass: every layer's backing.get is called exactly once.
    const first = await stores.api.get('K');
    expect(first).toBe('V_from_api');
    expect(api.backing.get).toHaveBeenCalledTimes(1);
    expect(redis.backing.get).toHaveBeenCalledTimes(1);

    // Both intermediate tiers now hold the value. wrapped-api's MISS-path
    // populates its cacheStore (wrapped-redis) via `cacheStore.set(prefixed,
    // ...)`, which lands as `redis.backing.set('api:K', V)`. wrapped-redis's
    // write-through then forwards the value into memory as
    // `redis:api:K`. (Naming intuition: each wrapper layer prepends its own
    // `namespace` prefix on top of whatever key it received.)
    expect(redis.backing.data.get('api:K')).toBe('V_from_api');
    expect(memory.backing.data.get('redis:api:K')).toBe('V_from_api');

    // Warm pass: api and redis are untouched; memory serves directly.
    api.backing.get.mockClear();
    redis.backing.get.mockClear();
    const second = await stores.api.get('K');
    expect(second).toBe('V_from_api');
    expect(api.backing.get).toHaveBeenCalledTimes(0);
    expect(redis.backing.get).toHaveBeenCalledTimes(0);
  });

  it('write-through propagates through all tiers', async () => {
    const collector = createMockCollector();
    const memory = createTrackedStoreLayer('memory-mock');
    const redis = createTrackedStoreLayer('redis-mock');
    const api = createTrackedStoreLayer('api-mock');

    const stores = await initStores(collector, {
      api: {
        code: api.init,
        cache: { store: 'redis', rules: [{ ttl: 86400 }] },
      } as Store.InitStore,
      redis: {
        code: redis.init,
        cache: { store: 'memory', rules: [{ ttl: 300 }] },
      } as Store.InitStore,
      memory: { code: memory.init } as Store.InitStore,
    });

    await stores.api.set('K', 'V_written');

    // Write-through policy: backing first, then cacheStore (best-effort). Each
    // wrapped layer follows the same pattern, so all three backings record the
    // write. The key shape at each layer mirrors the read-path traversal:
    //   api-backing:   'K'              (the original user key)
    //   redis-backing: 'api:K'          (wrapped-api prefixed the cacheStore
    //                                    set with its namespace before
    //                                    delegating to wrapped-redis.set)
    //   memory:        'redis:api:K'    (wrapped-redis prefixed its own
    //                                    cacheStore set with `redis:` on top)
    expect(api.backing.set).toHaveBeenCalledTimes(1);
    expect(redis.backing.set).toHaveBeenCalledTimes(1);
    expect(api.backing.data.get('K')).toBe('V_written');
    expect(redis.backing.data.get('api:K')).toBe('V_written');
    expect(memory.backing.data.get('redis:api:K')).toBe('V_written');

    // A subsequent get is fully served by the memory layer: wrapped-redis's
    // cache probe for `redis:api:K` hits memory immediately, so neither
    // wrapped-redis's backing nor wrapped-api's backing is consulted.
    api.backing.get.mockClear();
    redis.backing.get.mockClear();
    const readBack = await stores.api.get('K');
    expect(readBack).toBe('V_written');
    expect(api.backing.get).toHaveBeenCalledTimes(0);
    expect(redis.backing.get).toHaveBeenCalledTimes(0);
  });
});
