import type { Cache, Collector, Hooks, Store } from '@walkeros/core';
import { createMockLogger, createTelemetryHooks } from '@walkeros/core';
import type { FlowState } from '@walkeros/core';
import { initStores } from '../store';

/**
 * Verifies that the cache wrapper emits cache HIT/MISS observability via
 * the per-store `StoreCacheRead_<id>` hook, and that the telemetry helper
 * surfaces it as `meta.cached: true|false`.
 */

function createTestCollector(hooks: Hooks.Functions): Collector.Instance {
  return {
    push: jest.fn(),
    command: jest.fn(),
    allowed: true,
    config: { globalsStatic: {}, sessionStatic: {}, queueMax: 1000 },
    consent: {},
    custom: {},
    sources: {},
    destinations: {},
    transformers: {},
    stores: {},
    globals: {},
    hooks,
    logger: createMockLogger(),
    on: {},
    queue: [],
    round: 0,
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

describe('store-cache wrapper: cache HIT/MISS emits FlowState via hooks', () => {
  it('first get emits cached:false; second get emits cached:true', async () => {
    const states: FlowState[] = [];
    const teleHooks = createTelemetryHooks(
      (s: FlowState) => states.push(s),
      { flowId: 'default' },
      ['api'],
    );
    const collector = createTestCollector(teleHooks);

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

    // First read: cache MISS.
    const first = await stores.api.get('user');
    expect(first).toBe('alice');
    expect(calls.get).toBe(1);

    // Second read: cache HIT, backing.get must NOT fire again.
    const second = await stores.api.get('user');
    expect(second).toBe('alice');
    expect(calls.get).toBe(1);

    const cacheStates = states.filter((s) => s.meta?.op === 'cache');
    expect(cacheStates.length).toBe(2);
    expect(cacheStates[0].stepId).toBe('store.api');
    expect(cacheStates[0].meta?.cached).toBe(false);
    expect(cacheStates[0].meta?.status).toBe('miss');
    expect(cacheStates[0].meta?.key).toBe('user');
    expect(cacheStates[1].meta?.cached).toBe(true);
    expect(cacheStates[1].meta?.status).toBe('hit');
  });

  it('store get hooks still fire on both cache MISS and HIT', async () => {
    const states: FlowState[] = [];
    const teleHooks = createTelemetryHooks(
      (s: FlowState) => states.push(s),
      { flowId: 'default' },
      ['api'],
    );
    const collector = createTestCollector(teleHooks);

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
    await stores.api.get('user'); // MISS
    await stores.api.get('user'); // HIT

    // Each consumer-facing get fires the outer StoreGet_api hooks, giving
    // us one in+out pair per call (regardless of HIT/MISS).
    const inOut = states.filter(
      (s) =>
        s.stepType === 'store' &&
        s.meta?.op === 'get' &&
        (s.phase === 'in' || s.phase === 'out'),
    );
    expect(inOut.length).toBe(4);
  });
});
