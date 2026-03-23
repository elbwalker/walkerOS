import { startFlow } from '..';
import type { Source, Transformer, WalkerOS, Elb } from '@walkeros/core';

describe('native next routing', () => {
  it('should route events through conditional source.next', async () => {
    const order: string[] = [];
    const destinationEvents: WalkerOS.Event[] = [];

    const gtagParser: Transformer.Init = (context) => ({
      type: 'gtag-parser',
      config: context.config,
      push(event, context) {
        order.push('gtag-parser');
        const body = (context.ingest as any)?.body || {};
        return {
          event: {
            name: `page ${body.en || 'unknown'}`,
            data: { value: body.value ? Number(body.value) : undefined },
          },
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
          next: [
            {
              match: { key: 'path', operator: 'prefix', value: '/gtag' },
              next: 'gtag-parser',
            },
            { match: '*', next: [] },
          ],
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
        'gtag-parser': { code: gtagParser },
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

  it('should passthrough when no route matches', async () => {
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
          next: [
            {
              match: { key: 'path', operator: 'prefix', value: '/gtag' },
              next: 'parser',
            },
          ],
        },
      },
      transformers: {
        parser: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'parser',
            config: context.config,
            push() {
              throw new Error('should not be called');
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
      data: { title: 'Home' },
    });

    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].name).toBe('page view');
  });

  it('should support chained routes (route target with transformer.next)', async () => {
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
          next: [{ match: '*', next: 'a' }],
        },
      },
      transformers: {
        a: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'a',
            config: context.config,
            push(event) {
              order.push('a');
              return { event: { ...event, data: { ...event.data, a: true } } };
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
              return { event: { ...event, data: { ...event.data, b: true } } };
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

    await collector.sources.testSource.push({ name: 'page view', data: {} });

    expect(order).toEqual(['a', 'b']);
    expect(destinationEvents).toHaveLength(1);
    expect(destinationEvents[0].data?.a).toBe(true);
    expect(destinationEvents[0].data?.b).toBe(true);
  });
});
