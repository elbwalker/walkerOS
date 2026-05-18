import { startFlow } from '..';
import { Source } from '@walkeros/core';
import type {
  Destination,
  RespondFn,
  RespondOptions,
  Store,
  WalkerOS,
} from '@walkeros/core';

/**
 * A `cache.store` wired to an async backing store on a source must read
 * through correctly: the Promise returned by `store.get` is awaited
 * inside `checkCache`, so the cached body lands in `respond` as the
 * actual object, not as a Promise instance.
 */

type RawIngest = { method: string; path: string };

interface TestPushFn {
  (rawData: RawIngest): Promise<void>;
}

type TestSourceTypes = Source.Types<unknown, unknown, TestPushFn>;

function createAsyncStoreInit(data: Map<string, unknown>): Store.Init {
  return (context) => ({
    type: 'async-mock',
    config: context.config as Store.Config,
    get: async (key: string) => data.get(key),
    set: async (key: string, value: unknown) => {
      data.set(key, value);
    },
    delete: async (key: string) => {
      data.delete(key);
    },
  });
}

function createRespondingDestination(
  responseBody: string,
): Destination.Instance {
  return {
    type: 'responder',
    config: {},
    push: async (_event: WalkerOS.Event, context: Destination.PushContext) => {
      const respond = context.env?.respond as RespondFn | undefined;
      respond?.({ body: responseBody, status: 200 });
    },
  };
}

describe('source cache with async backing store', () => {
  it('returns cached respond body (not a Promise) on HIT', async () => {
    const cacheData = new Map<string, unknown>();
    // Pre-seed the async cache store with a cached respond payload
    // under the namespaced key that the cache rule will compute.
    // The source's namespace is undefined and the rule keys on
    // `ingest.method` + `ingest.path`, so the raw key is `GET:/api/data`.
    cacheData.set('GET:/api/data', { body: 'cached body', status: 200 });

    const allResponses: RespondOptions[] = [];

    const { collector } = await startFlow({
      stores: {
        asyncCache: { code: createAsyncStoreInit(cacheData) },
      },
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => {
            const { config } = context;
            return {
              type: 'test',
              config: config as Source.Config<TestSourceTypes>,
              push: async (rawData: RawIngest) => {
                const respond = (options?: RespondOptions) => {
                  if (options) allResponses.push(options);
                };
                await context.withScope(rawData, respond, async (env) => {
                  await env.push({ name: 'page view', data: {} });
                });
              },
            };
          },
          cache: {
            store: 'asyncCache',
            // stop defaults to true for sources: a HIT short-circuits
            // the pipeline and responds with the cached value.
            rules: [
              {
                match: {
                  key: 'ingest.method',
                  operator: 'eq',
                  value: 'GET',
                },
                key: ['ingest.method', 'ingest.path'],
                ttl: 300,
              },
            ],
          },
          config: {
            ingest: {
              map: { method: { key: 'method' }, path: { key: 'path' } },
            },
          },
        },
      },
      destinations: {
        responder: { code: createRespondingDestination('miss body') },
      },
    });

    const testSource = Source.getSource<TestSourceTypes>(
      collector,
      'testSource',
    );

    // HIT path: pre-seeded key.
    await testSource.push({ method: 'GET', path: '/api/data' });

    // The cached body must arrive in respond as a plain object, never
    // as a Promise. A Promise here is the regression we are guarding
    // against.
    expect(allResponses).toHaveLength(1);
    expect(allResponses[0]).toEqual({ body: 'cached body', status: 200 });
    expect(allResponses[0]).not.toBeInstanceOf(Promise);
  });

  it('falls through to pipeline on MISS', async () => {
    const cacheData = new Map<string, unknown>();
    const allResponses: RespondOptions[] = [];

    const { collector } = await startFlow({
      stores: {
        asyncCache: { code: createAsyncStoreInit(cacheData) },
      },
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => {
            const { config } = context;
            return {
              type: 'test',
              config: config as Source.Config<TestSourceTypes>,
              push: async (rawData: RawIngest) => {
                const respond = (options?: RespondOptions) => {
                  if (options) allResponses.push(options);
                };
                await context.withScope(rawData, respond, async (env) => {
                  await env.push({ name: 'page view', data: {} });
                });
              },
            };
          },
          cache: {
            store: 'asyncCache',
            rules: [
              {
                match: {
                  key: 'ingest.method',
                  operator: 'eq',
                  value: 'GET',
                },
                key: ['ingest.method', 'ingest.path'],
                ttl: 300,
              },
            ],
          },
          config: {
            ingest: {
              map: { method: { key: 'method' }, path: { key: 'path' } },
            },
          },
        },
      },
      destinations: {
        responder: { code: createRespondingDestination('miss body') },
      },
    });

    const testSource = Source.getSource<TestSourceTypes>(
      collector,
      'testSource',
    );

    await testSource.push({ method: 'GET', path: '/api/data' });

    expect(allResponses).toHaveLength(1);
    expect(allResponses[0]).toEqual({ body: 'miss body', status: 200 });
  });
});
