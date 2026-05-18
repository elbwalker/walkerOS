import type { Collector, Store } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { MockLogger } from '@walkeros/core';
import { initStores } from '../store';

/**
 * Tests for Task 11 of the store-cache plan: namespace defaulting and the
 * single startup log line emitted per wrapped store. The wrapper itself is
 * exercised through `initStores` so we get the full phase 2 wiring — that is
 * the only path that resolves `cacheConfig.namespace ?? storeId` and emits the
 * startup log.
 */

interface MockCollectorWithLogger extends Collector.Instance {
  logger: MockLogger;
  stores: Store.Stores;
}

function createMockCollector(): MockCollectorWithLogger {
  return {
    logger: createMockLogger(),
    stores: {},
    hooks: {},
  } as unknown as MockCollectorWithLogger;
}

interface TrackedBacking {
  data: Map<string, unknown>;
  get: jest.Mock<unknown, [string]>;
  set: jest.Mock<void, [string, unknown, number | undefined]>;
  delete: jest.Mock<void, [string]>;
}

/**
 * Minimal in-memory `Store.Init` paired with the raw data map and mocks the
 * test body asserts against. Mirrors the helper in
 * `store-cache-tier-skipping.test.ts` — duplicated rather than shared to keep
 * each test file self-contained (per repo policy in AGENT.md, strict modularity
 * over cross-test coupling).
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

/**
 * Walk `MockLogger.scopedLoggers` recursively and concatenate every `info`
 * call's first argument. Phase 2 reaches the leaf logger via
 * `collector.logger.scope('store-cache').scope(storeId).info(...)`, so the
 * messages live two levels deep. Flattening here keeps assertions simple.
 */
function collectInfoMessages(logger: MockLogger): string[] {
  const messages: string[] = [];
  const visit = (l: MockLogger): void => {
    for (const call of l.info.mock.calls) {
      if (typeof call[0] === 'string') messages.push(call[0]);
    }
    for (const child of l.scopedLoggers) visit(child);
  };
  visit(logger);
  return messages;
}

describe('store-cache: namespace defaulting + startup log', () => {
  it('omitted namespace defaults to host store id (keys stored under "<storeId>:K")', async () => {
    const collector = createMockCollector();
    const memory = createTrackedStoreLayer('memory-mock');
    const api = createTrackedStoreLayer('api-mock');

    const stores = await initStores(collector, {
      api: {
        code: api.init,
        cache: { store: 'memory', rules: [{ ttl: 60 }] },
      } as Store.InitStore,
      memory: { code: memory.init } as Store.InitStore,
    });

    api.backing.data.set('K', 'V');
    await stores.api.get('K');

    // The wrapped-api forwarded its set to wrapped-memory using `api:K` as the
    // key. Since memory has no cache wrapper of its own, the raw backing map
    // records the same key directly. This proves the namespace defaulted to
    // the host store id.
    expect(memory.backing.data.get('api:K')).toBe('V');
    expect(memory.backing.data.get('K')).toBeUndefined();
  });

  it('explicit namespace overrides default', async () => {
    const collector = createMockCollector();
    const memory = createTrackedStoreLayer('memory-mock');
    const api = createTrackedStoreLayer('api-mock');

    const stores = await initStores(collector, {
      api: {
        code: api.init,
        cache: {
          store: 'memory',
          namespace: 'custom',
          rules: [{ ttl: 60 }],
        },
      } as Store.InitStore,
      memory: { code: memory.init } as Store.InitStore,
    });

    api.backing.data.set('K', 'V');
    await stores.api.get('K');

    expect(memory.backing.data.get('custom:K')).toBe('V');
    // Neither the default (storeId) nor the bare key should be set.
    expect(memory.backing.data.get('api:K')).toBeUndefined();
    expect(memory.backing.data.get('K')).toBeUndefined();
  });

  it('emits one startup log line per wrapped store', async () => {
    const collector = createMockCollector();
    const memory = createTrackedStoreLayer('memory-mock');
    const redis = createTrackedStoreLayer('redis-mock');
    const api = createTrackedStoreLayer('api-mock');

    await initStores(collector, {
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

    const messages = collectInfoMessages(collector.logger);
    expect(messages).toEqual(
      expect.arrayContaining([
        'store "api" caches with namespace "api:" via redis',
        'store "redis" caches with namespace "redis:" via memory',
      ]),
    );
    // Memory is the terminal — no cache config, no startup line.
    expect(messages.some((m) => m.includes('store "memory" caches'))).toBe(
      false,
    );
  });

  it('emits startup log naming __cache when cache.store is omitted', async () => {
    const collector = createMockCollector();
    const api = createTrackedStoreLayer('api-mock');

    await initStores(collector, {
      api: {
        code: api.init,
        cache: { rules: [{ ttl: 60 }] },
      } as Store.InitStore,
    });

    const messages = collectInfoMessages(collector.logger);
    expect(messages).toEqual(
      expect.arrayContaining([
        'store "api" caches with namespace "api:" via __cache',
      ]),
    );
  });

  it('emits startup log reflecting an explicit namespace override', async () => {
    const collector = createMockCollector();
    const api = createTrackedStoreLayer('api-mock');

    await initStores(collector, {
      api: {
        code: api.init,
        cache: { namespace: 'custom', rules: [{ ttl: 60 }] },
      } as Store.InitStore,
    });

    const messages = collectInfoMessages(collector.logger);
    expect(messages).toEqual(
      expect.arrayContaining([
        'store "api" caches with namespace "custom:" via __cache',
      ]),
    );
  });
});
