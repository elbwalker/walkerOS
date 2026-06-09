import type { Cache, Collector, FlowState, Store } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { initStores } from '../store';

function createTestCollector(): Collector.Instance {
  return {
    push: async () => ({ ok: true }),
    command: async () => ({ ok: true }),
    allowed: true,
    config: {
      globalsStatic: {},
      sessionStatic: {},
      queueMax: 1000,
    },
    consent: {},
    custom: {},
    sources: {},
    destinations: {},
    transformers: {},
    stores: {},
    globals: {},
    hooks: {},
    observers: new Set(),
    logger: createMockLogger(),
    on: {},
    queue: [],
    round: 0,
    stateVersion: 0,
    cellVersion: {},
    delivery: new WeakMap(),
    seenEvents: new Set(),
    session: undefined,
    status: {
      startedAt: 0,
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations: {},
      dropped: {},
    },
    timing: 0,
    user: {},
    pending: { destinations: {} },
  };
}

function createBackingInit(): {
  init: Store.Init;
  data: Map<string, Store.StoreValue>;
  calls: { get: number; set: number; delete: number };
} {
  const data = new Map<string, Store.StoreValue>();
  const calls = { get: 0, set: 0, delete: 0 };
  const init: Store.Init = (context) => ({
    type: 'backing',
    config: context.config as Store.Config,
    get(key: string) {
      calls.get++;
      return data.get(key);
    },
    set(key: string, value: Store.StoreValue) {
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

describe('store-cache wrapper observer emissions', () => {
  it('first get emits cached:false (miss); second get emits cached:true (hit)', async () => {
    const collector = createTestCollector();
    const states: FlowState[] = [];
    collector.observers.add((s) => states.push(s));

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

    data.set('user', 'alice');

    await stores.api.get('user');
    expect(calls.get).toBe(1);

    await stores.api.get('user');
    expect(calls.get).toBe(1);

    const cacheStates = states.filter(
      (s) => s.stepType === 'store' && s.meta?.op === 'cache',
    );
    expect(cacheStates.length).toBe(2);
    expect(cacheStates[0].stepId).toBe('store.api');
    expect(cacheStates[0].meta?.cached).toBe(false);
    expect(cacheStates[0].meta?.status).toBe('miss');
    expect(cacheStates[0].meta?.key).toBe('user');
    expect(cacheStates[1].meta?.cached).toBe(true);
    expect(cacheStates[1].meta?.status).toBe('hit');
  });

  it('store.get emits in+out on every consumer-facing call regardless of cache hit', async () => {
    const collector = createTestCollector();
    const states: FlowState[] = [];
    collector.observers.add((s) => states.push(s));

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
    await stores.api.get('user'); // miss
    await stores.api.get('user'); // hit

    const inOut = states.filter(
      (s) =>
        s.stepType === 'store' &&
        s.meta?.op === 'get' &&
        (s.phase === 'in' || s.phase === 'out'),
    );
    expect(inOut.length).toBe(4);
  });
});
