import type { Collector, Store } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { initStores } from '../store';

/**
 * Minimal mock collector for store init tests. `initStores` only reads
 * `logger`, `hooks`, and `stores` from the collector.
 */
function createMockCollector(): Collector.Instance {
  return {
    logger: createMockLogger(),
    stores: {},
    hooks: {},
  } as unknown as Collector.Instance;
}

/**
 * Minimal in-memory store factory used to keep the tests focused on the
 * two-phase init walker. The instances are deliberately simple `Store.Instance`
 * shapes (no caching behavior); Task 7+ will introduce the wrapping logic
 * exercised through these declarations.
 */
function createMemStoreInit(): Store.Init {
  return (context) => ({
    type: 'mem',
    config: context.config as Store.Config,
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  });
}

describe('two-phase store init', () => {
  it('resolves cache.store regardless of declaration order', async () => {
    const collector = createMockCollector();

    // `api` declared BEFORE `mem`, with `api.cache.store = 'mem'`.
    // The two-phase walker must not throw on the forward reference.
    const stores = await initStores(collector, {
      api: {
        code: createMemStoreInit(),
        cache: {
          store: 'mem',
          rules: [{ ttl: 60 }],
        },
      } as Store.InitStore,
      mem: {
        code: createMemStoreInit(),
      } as Store.InitStore,
    });

    expect(stores.api).toBeDefined();
    expect(stores.mem).toBeDefined();
    expect(stores.api.type).toBe('mem');
    expect(stores.mem.type).toBe('mem');
  });

  it('throws on cycle (A.cache.store=B, B.cache.store=A)', async () => {
    const collector = createMockCollector();

    await expect(
      initStores(collector, {
        a: {
          code: createMemStoreInit(),
          cache: { store: 'b', rules: [{ ttl: 60 }] },
        } as Store.InitStore,
        b: {
          code: createMemStoreInit(),
          cache: { store: 'a', rules: [{ ttl: 60 }] },
        } as Store.InitStore,
      }),
    ).rejects.toThrow(/Cycle in cache\.store chain.*a.*b.*a/);
  });

  it('throws on self-cycle (A.cache.store=A)', async () => {
    const collector = createMockCollector();

    await expect(
      initStores(collector, {
        a: {
          code: createMemStoreInit(),
          cache: { store: 'a', rules: [{ ttl: 60 }] },
        } as Store.InitStore,
      }),
    ).rejects.toThrow(/Cycle in cache\.store chain.*a.*a/);
  });

  it('throws when cache.store points at non-existent store id', async () => {
    const collector = createMockCollector();

    await expect(
      initStores(collector, {
        api: {
          code: createMemStoreInit(),
          cache: { store: 'nope', rules: [{ ttl: 60 }] },
        } as Store.InitStore,
      }),
    ).rejects.toThrow(/cache\.store.*"nope".*not.*declared|unknown.*"nope"/i);
  });

  it('phase 1 succeeds without cache field (existing behavior)', async () => {
    const collector = createMockCollector();

    const stores = await initStores(collector, {
      mem: { code: createMemStoreInit() },
    });

    expect(stores.mem).toBeDefined();
    expect(stores.mem.type).toBe('mem');
  });

  it('accepts a valid chain of length 3 (a -> b -> c)', async () => {
    const collector = createMockCollector();

    const stores = await initStores(collector, {
      a: {
        code: createMemStoreInit(),
        cache: { store: 'b', rules: [{ ttl: 60 }] },
      } as Store.InitStore,
      b: {
        code: createMemStoreInit(),
        cache: { store: 'c', rules: [{ ttl: 60 }] },
      } as Store.InitStore,
      c: { code: createMemStoreInit() },
    });

    expect(stores.a).toBeDefined();
    expect(stores.b).toBeDefined();
    expect(stores.c).toBeDefined();
  });
});
