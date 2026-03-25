import { startFlow } from '..';
import type { Source, Transformer, Elb } from '@walkeros/core';

describe('transformer.before chain', () => {
  it('runs before chain before transformer push', async () => {
    const order: string[] = [];

    const { collector } = await startFlow({
      sources: {
        s: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          next: 'enrich',
        },
      },
      transformers: {
        lookup: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'lookup',
            config: context.config,
            push: async (event, ctx) => {
              order.push('lookup');
              ctx.ingest.lookedUp = true;
              return { event };
            },
          }),
        },
        enrich: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'enrich',
            config: context.config,
            push: async (event, ctx) => {
              order.push('enrich');
              expect(ctx.ingest.lookedUp).toBe(true);
              return {
                event: { ...event, data: { ...event.data, enriched: true } },
              };
            },
          }),
          before: 'lookup',
        },
      },
      destinations: {
        d: {
          code: {
            type: 'test',
            config: {},
            push: async (event) => {
              expect(event.data?.enriched).toBe(true);
            },
          },
        },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    expect(order).toEqual(['lookup', 'enrich']);
  });

  it('before chain returning false stops the pipeline', async () => {
    let enrichRan = false;

    const { collector } = await startFlow({
      sources: {
        s: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          next: 'enrich',
        },
      },
      transformers: {
        gate: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'gate',
            config: context.config,
            push: async () => false as const,
          }),
        },
        enrich: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'enrich',
            config: context.config,
            push: async (event) => {
              enrichRan = true;
              return { event };
            },
          }),
          before: 'gate',
        },
      },
      destinations: {
        d: {
          code: { type: 'test', config: {}, push: async () => {} },
        },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    expect(enrichRan).toBe(false);
  });

  it('before chain can modify event before transformer receives it', async () => {
    let enrichedEventName: string | undefined;

    const { collector } = await startFlow({
      sources: {
        s: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          next: 'main',
        },
      },
      transformers: {
        prefix: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'prefix',
            config: context.config,
            push: async (event) => {
              return {
                event: {
                  ...event,
                  data: { ...event.data, prefixed: true },
                },
              };
            },
          }),
        },
        main: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'main',
            config: context.config,
            push: async (event) => {
              enrichedEventName = event.name;
              // Verify that the before chain already modified the event
              expect(event.data?.prefixed).toBe(true);
              return { event };
            },
          }),
          before: 'prefix',
        },
      },
      destinations: {
        d: {
          code: { type: 'test', config: {}, push: async () => {} },
        },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    expect(enrichedEventName).toBe('page view');
  });
});
