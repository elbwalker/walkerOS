import { startFlow } from '..';
import type { Store, Transformer, WalkerOS } from '@walkeros/core';

/**
 * A transformer's `cache.store` wired to an async backing store must
 * read through correctly: the Promise returned by `store.get` is
 * awaited inside `checkCache`, so a HIT delivers the cached event
 * object downstream, not a Promise.
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

describe('transformer cache with async backing store', () => {
  it('delivers the cached event object (not a Promise) on HIT', async () => {
    const cacheData = new Map<string, Store.StoreValue>();
    // Pre-seed the async cache store with a cached event under the key
    // the cache rule will compute. The rule keys on `event.name` and
    // the transformer applies no namespace, so the raw key is
    // `page view`.
    const cachedEvent = {
      name: 'page view',
      data: { enriched: 'from-cache' },
    };
    cacheData.set('page view', cachedEvent);

    let enricherCalls = 0;
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      stores: {
        asyncCache: { code: createAsyncStoreInit(cacheData) },
      },
      transformers: {
        enricher: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: ctx.config,
            push(event) {
              enricherCalls++;
              return {
                event: { ...event, data: { ...event.data, enriched: 'fresh' } },
              };
            },
          }),
          cache: {
            store: 'asyncCache',
            rules: [{ key: ['event.name'], ttl: 60 }],
          },
        },
      },
      destinations: {
        spy: {
          before: 'enricher',
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    // HIT path: enricher must NOT run; the cached event flows through
    // to the destination as the actual object.
    await elb({ name: 'page view', data: {} });

    expect(enricherCalls).toBe(0);
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.enriched).toBe('from-cache');
  });

  it('runs the transformer chain on MISS', async () => {
    const cacheData = new Map<string, Store.StoreValue>();
    let enricherCalls = 0;
    const destinationEvents: WalkerOS.Event[] = [];

    const { elb } = await startFlow({
      stores: {
        asyncCache: { code: createAsyncStoreInit(cacheData) },
      },
      transformers: {
        enricher: {
          code: async (ctx): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: ctx.config,
            push(event) {
              enricherCalls++;
              return {
                event: { ...event, data: { ...event.data, enriched: true } },
              };
            },
          }),
          cache: {
            store: 'asyncCache',
            rules: [{ key: ['event.name'], ttl: 60 }],
          },
        },
      },
      destinations: {
        spy: {
          before: 'enricher',
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    await elb({ name: 'page view', data: {} });

    expect(enricherCalls).toBe(1);
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.enriched).toBe(true);
  });
});
