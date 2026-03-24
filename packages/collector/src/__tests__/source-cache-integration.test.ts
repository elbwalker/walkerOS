import { startFlow } from '..';
import type { Source, WalkerOS, Destination } from '@walkeros/core';
import type { RespondFn, RespondOptions } from '@walkeros/core';

/**
 * Creates a destination that calls respond with a body.
 * Simulates the real-world pattern where a destination (or responder
 * transformer) sends a response back to the source's HTTP handler.
 */
function createRespondingDestination(
  destinationCalls: string[],
  responseBody: string = 'response data',
): Destination.Instance {
  return {
    type: 'responder',
    config: {},
    push: async (_event: WalkerOS.Event, context: Destination.PushContext) => {
      destinationCalls.push('destination');
      // Call respond (simulates sending HTTP response back)
      const respond = context.env?.respond as RespondFn | undefined;
      respond?.({ body: responseBody, status: 200 });
    },
  };
}

describe('Source cache integration', () => {
  it('should serve cached respond on HIT and skip pipeline', async () => {
    const destinationCalls: string[] = [];
    const allResponses: (RespondOptions | undefined)[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => {
            const { env, config, setIngest, setRespond } = context;
            return {
              type: 'test',
              config: config as Source.Config,
              push: (async (rawData: unknown) => {
                await setIngest(rawData);
                setRespond(((options?: RespondOptions) => {
                  allResponses.push(options);
                }) as RespondFn);
                await env.push({ name: 'page view', data: {} });
              }) as any,
            };
          },
          cache: {
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
        responder: {
          code: createRespondingDestination(destinationCalls),
        },
      },
    });

    // First request: MISS — pipeline runs, destination calls respond (caches it)
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/data',
    });
    expect(destinationCalls).toHaveLength(1);
    expect(allResponses).toHaveLength(1);
    expect(allResponses[0]).toEqual({ body: 'response data', status: 200 });

    // Second request: HIT — pipeline skipped, respond called with cached value
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/data',
    });
    expect(destinationCalls).toHaveLength(1); // Destination NOT called again
    expect(allResponses).toHaveLength(2); // Respond called from cache
    expect(allResponses[1]).toEqual({ body: 'response data', status: 200 });
  });

  it('should not cache when no rule matches (POST request)', async () => {
    const destinationCalls: string[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => {
            const { env, config, setIngest } = context;
            return {
              type: 'test',
              config: config as Source.Config,
              push: (async (rawData: unknown) => {
                await setIngest(rawData);
                await env.push({ name: 'page view', data: {} });
              }) as any,
            };
          },
          cache: {
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
        spy: {
          code: createRespondingDestination(destinationCalls),
        },
      },
    });

    await (collector.sources.testSource.push as any)({
      method: 'POST',
      path: '/api/data',
    });
    await (collector.sources.testSource.push as any)({
      method: 'POST',
      path: '/api/data',
    });
    expect(destinationCalls).toHaveLength(2); // Both execute — no caching for POST
  });

  it('should cache different paths independently', async () => {
    const destinationCalls: string[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => {
            const { env, config, setIngest, setRespond } = context;
            return {
              type: 'test',
              config: config as Source.Config,
              push: (async (rawData: unknown) => {
                await setIngest(rawData);
                setRespond((() => {}) as RespondFn);
                await env.push({ name: 'page view', data: {} });
              }) as any,
            };
          },
          cache: {
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
        responder: {
          code: createRespondingDestination(destinationCalls),
        },
      },
    });

    // Request to /api/users (MISS)
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/users',
    });
    expect(destinationCalls).toHaveLength(1);

    // Request to /api/data — different cache key (MISS)
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/data',
    });
    expect(destinationCalls).toHaveLength(2);

    // Repeat /api/users — should be HIT
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/users',
    });
    expect(destinationCalls).toHaveLength(2); // Served from cache

    // Repeat /api/data — should be HIT
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/data',
    });
    expect(destinationCalls).toHaveLength(2); // Served from cache
  });

  it('should skip pipeline on HIT even when source has next chain', async () => {
    const destinationCalls: string[] = [];
    const transformerCalls: string[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => {
            const { env, config, setIngest, setRespond } = context;
            return {
              type: 'test',
              config: config as Source.Config,
              push: (async (rawData: unknown) => {
                await setIngest(rawData);
                setRespond((() => {}) as RespondFn);
                await env.push({ name: 'page view', data: {} });
              }) as any,
            };
          },
          next: 'enrich',
          cache: {
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
      transformers: {
        enrich: {
          code: async (context) => ({
            type: 'enricher',
            config: context.config,
            push(event) {
              transformerCalls.push('enrich');
              return { event };
            },
          }),
        },
      },
      destinations: {
        responder: {
          code: createRespondingDestination(destinationCalls),
        },
      },
    });

    // MISS: transformer and destination run
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/data',
    });
    expect(destinationCalls).toHaveLength(1);
    expect(transformerCalls).toEqual(['enrich']);

    // HIT: neither transformer nor destination should run
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/data',
    });
    expect(destinationCalls).toHaveLength(1); // No new destination call
    expect(transformerCalls).toEqual(['enrich']); // No new transformer call
  });

  it('should continue pipeline on HIT when full=false', async () => {
    const destinationCalls: string[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => {
            const { env, config, setIngest, setRespond } = context;
            return {
              type: 'test',
              config: config as Source.Config,
              push: (async (rawData: unknown) => {
                await setIngest(rawData);
                setRespond((() => {}) as RespondFn);
                await env.push({ name: 'page view', data: {} });
              }) as any,
            };
          },
          cache: {
            full: false,
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
        responder: {
          code: createRespondingDestination(destinationCalls),
        },
      },
    });

    // First request: MISS — pipeline runs
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/data',
    });
    expect(destinationCalls).toHaveLength(1);

    // Second request: HIT with full=false — pipeline still runs
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/data',
    });
    expect(destinationCalls).toHaveLength(2); // Destination still called
  });

  it('should apply update rules on HIT and MISS', async () => {
    const respondPayloads: any[] = [];
    let respondResolve: (() => void) | undefined;

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => {
            const { env, config, setIngest, setRespond } = context;
            return {
              type: 'test',
              config: config as Source.Config,
              push: (async (rawData: any) => {
                await setIngest(rawData);
                const respondPromise = new Promise<void>((resolve) => {
                  respondResolve = resolve;
                });
                setRespond(((options?: any) => {
                  respondPayloads.push(options);
                  respondResolve?.();
                }) as RespondFn);
                await env.push({ name: 'page view', data: {} });
                // Wait for respond to be called (may be async due to applyUpdate)
                await respondPromise;
              }) as any,
            };
          },
          cache: {
            rules: [
              {
                match: { key: 'ingest.method', operator: 'eq', value: 'GET' },
                key: ['ingest.method', 'ingest.path'],
                ttl: 300,
                update: {
                  'headers.X-Cache': { key: 'cache.status' },
                },
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
        responder: {
          code: createRespondingDestination([], 'ok'),
        },
      },
    });

    // MISS: respond should have X-Cache: MISS
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/test',
    });
    expect(respondPayloads).toHaveLength(1);
    expect(respondPayloads[0]?.headers?.['X-Cache']).toBe('MISS');

    // HIT: respond should have X-Cache: HIT
    respondPayloads.length = 0;
    await (collector.sources.testSource.push as any)({
      method: 'GET',
      path: '/api/test',
    });
    expect(respondPayloads).toHaveLength(1);
    expect(respondPayloads[0]?.headers?.['X-Cache']).toBe('HIT');
  });
});
