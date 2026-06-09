import { startFlow } from '..';
import type { Store } from '@walkeros/core';

/**
 * A `cache.store` wired to an async backing store must read through
 * correctly: the Promise returned by `store.get` is awaited inside
 * `checkCache`, so HIT/MISS semantics match those of a sync store.
 *
 * Both call sites in `destination.ts` are exercised: the full cache
 * check that runs before any chain on `stop: true`, and the step-level
 * check that runs after the before chain on `stop: false`.
 */

/**
 * Build an async, Map-backed `Store.Init`. Mirrors the shared
 * `createAsyncMockStore` helper in `@walkeros/core`, re-inlined here
 * because collector integration tests stay self-contained per repo
 * policy.
 */
function createAsyncStoreInit(data: Map<string, Store.StoreValue>): Store.Init {
  return (context) => ({
    type: 'async-mock',
    config: context.config as Store.Config,
    get: async (key: string) => data.get(key),
    set: async (key: string, value: Store.StoreValue) => {
      data.set(key, value);
    },
    delete: async (key: string) => {
      data.delete(key);
    },
  });
}

describe('destination cache with async backing store', () => {
  it('full-cache HIT skips destination push and returns cached value (stop: true)', async () => {
    const cacheData = new Map<string, Store.StoreValue>();
    // Pre-seed the async store with a cached event under the key the
    // cache rule will compute. With namespace defaulted to the cache
    // wrapper's host store id, raw backing receives `<ns>:<key>` — but
    // for `cache.store: 'asyncCache'` wired directly (no nested wrapper),
    // the namespace comes from `compiled.namespace`, which is undefined,
    // so the key is just `event.name` joined.
    // The seeded value is only a HIT sentinel keyed by `event.name`; the test
    // asserts the push count, not the cached payload. Seed a plain structured
    // `StoreValue` so the async backing's contract holds without a cast.
    const seededEvent: Store.StoreValue = {
      name: 'page view',
      data: { cached: true },
      id: 'cached-id',
      entity: 'page',
      action: 'view',
      source: { type: 'collector' },
    };
    cacheData.set('page view', seededEvent);

    let pushCount = 0;

    const { elb } = await startFlow({
      stores: {
        asyncCache: { code: createAsyncStoreInit(cacheData) },
      },
      destinations: {
        spy: {
          code: {
            type: 'spy',
            config: {},
            push: async () => {
              pushCount++;
            },
          },
          cache: {
            store: 'asyncCache',
            stop: true,
            rules: [{ key: ['event.name'], ttl: 60 }],
          },
        },
      },
    });

    // First push: HIT on pre-seeded key — push must be skipped.
    await elb({ name: 'page view', data: {} });
    expect(pushCount).toBe(0);

    // Second push with a cold key: MISS — push fires.
    await elb({ name: 'order complete', data: {} });
    expect(pushCount).toBe(1);
  });

  it('step-cache HIT skips push but transformer ran (stop: false)', async () => {
    const cacheData = new Map<string, Store.StoreValue>();
    cacheData.set('page view', { sentinel: 'cached' });

    let pushCount = 0;

    const { elb } = await startFlow({
      stores: {
        asyncCache: { code: createAsyncStoreInit(cacheData) },
      },
      destinations: {
        spy: {
          code: {
            type: 'spy',
            config: {},
            push: async () => {
              pushCount++;
            },
          },
          cache: {
            store: 'asyncCache',
            // stop defaults to false — step-level HIT skips push but
            // does not halt the pipeline.
            rules: [{ key: ['event.name'], ttl: 60 }],
          },
        },
      },
    });

    // HIT path: push skipped because event.name is pre-seeded.
    await elb({ name: 'page view', data: {} });
    expect(pushCount).toBe(0);

    // MISS path: cold key, push fires.
    await elb({ name: 'product view', data: {} });
    expect(pushCount).toBe(1);
  });
});
