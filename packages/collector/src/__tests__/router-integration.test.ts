import { startFlow } from '..';
import { branch } from '@walkeros/core';
import type { Source, Transformer, WalkerOS, Elb } from '@walkeros/core';

// Inline mock router: matches ingest.path prefix and branches
const mockRouter: Transformer.Init = (context) => {
  const routes = (context.config.settings as any)?.routes || [];
  return {
    type: 'mock-router',
    config: context.config,
    push(event, ctx) {
      const ingest = (ctx.ingest || {}) as Record<string, unknown>;
      for (const route of routes) {
        if (route.match === '*') return branch({}, route.next);
        const val = String(ingest[route.match.key] || '');
        if (
          route.match.operator === 'prefix' &&
          val.startsWith(route.match.value)
        )
          return branch({}, route.next);
      }
      return; // passthrough
    },
  };
};

describe('router transformer integration', () => {
  it('should route events through branched chain to destination', async () => {
    const order: string[] = [];
    const destinationEvents: WalkerOS.Event[] = [];

    // Simple parser transformer that builds events from ingest body
    const gtagParser: Transformer.Init = (context) => ({
      type: 'gtag-parser',
      config: context.config,
      push(event, context) {
        order.push('gtag-parser');
        const body = (context.ingest as any)?.body || {};
        return {
          name: `page ${body.en || 'unknown'}`,
          data: { value: body.value ? Number(body.value) : undefined },
        };
      },
    });

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => {
            const { env, config, setIngest } = context;
            return {
              type: 'test',
              config: config as Source.Config,
              push: (async (rawData: any) => {
                await setIngest(rawData);
                await env.push({});
              }) as any,
            };
          },
          next: 'router',
          config: {
            ingest: {
              map: {
                path: { key: 'path' },
                method: { key: 'method' },
                body: { key: 'body' },
              },
            },
          },
        },
      },
      transformers: {
        router: {
          code: mockRouter,
          config: {
            settings: {
              routes: [
                {
                  match: {
                    key: 'path',
                    operator: 'prefix',
                    value: '/gtag',
                  },
                  next: 'gtag-parser',
                },
                { match: '*', next: [] }, // wildcard → no branch, passthrough
              ],
            },
          },
        },
        'gtag-parser': {
          code: gtagParser,
        },
      },
      destinations: {
        spy: {
          code: {
            type: 'spy',
            config: {},
            push: async (event: WalkerOS.Event) => {
              order.push('destination');
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    // Simulate a gtag request (raw data, not a DeepPartialEvent)
    await (collector.sources.testSource.push as any)({
      path: '/gtag/collect',
      method: 'GET',
      body: { en: 'purchase', value: '99.9' },
    });

    expect(order).toContain('gtag-parser');
    expect(order).toContain('destination');
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].name).toBe('page purchase');
    expect(destinationEvents[0].data?.value).toBe(99.9);
  });

  it('should passthrough non-matching routes', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => {
            const { env, config } = context;
            return {
              type: 'test',
              config: config as Source.Config,
              push: env.push as Elb.Fn,
            };
          },
          next: 'router',
        },
      },
      transformers: {
        router: {
          code: mockRouter,
          config: {
            settings: {
              routes: [
                {
                  match: {
                    key: 'path',
                    operator: 'prefix',
                    value: '/gtag',
                  },
                  next: 'parser',
                },
                // No wildcard → passthrough when no match
              ],
            },
          },
        },
      },
      destinations: {
        spy: {
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

    // Push a regular event (no ingest metadata, router won't match)
    await collector.sources.testSource.push({
      name: 'page view',
      data: { title: 'Home' },
    });

    // Router doesn't match → passthrough → event reaches destination
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].name).toBe('page view');
  });

  it('should support chain branching with transformer.next linking', async () => {
    const order: string[] = [];
    const destinationEvents: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => {
            const { env, config } = context;
            return {
              type: 'test',
              config: config as Source.Config,
              push: env.push as Elb.Fn,
            };
          },
          next: 'brancher',
        },
      },
      transformers: {
        brancher: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'brancher',
            config: context.config,
            push(event) {
              order.push('brancher');
              return branch(event, 'a');
            },
          }),
        },
        a: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'a',
            config: context.config,
            push(event) {
              order.push('a');
              return { ...event, data: { ...event.data, a: true } };
            },
          }),
          next: 'b',
        },
        b: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'b',
            config: context.config,
            push(event) {
              order.push('b');
              return { ...event, data: { ...event.data, b: true } };
            },
          }),
        },
      },
      destinations: {
        spy: {
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

    await collector.sources.testSource.push({
      name: 'page view',
      data: {},
    });

    expect(order).toEqual(['brancher', 'a', 'b']);
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.a).toBe(true);
    expect(destinationEvents[0].data?.b).toBe(true);
  });
});
