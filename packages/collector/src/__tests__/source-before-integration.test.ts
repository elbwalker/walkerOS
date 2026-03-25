import { startFlow } from '..';
import type { Source, Transformer, WalkerOS, Elb } from '@walkeros/core';

describe('source.before chain', () => {
  it('runs before chain before source.next chain', async () => {
    const order: string[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          before: 'decoder',
          next: 'enricher',
        },
      },
      transformers: {
        decoder: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'decoder',
            config: context.config,
            push: async (event, ctx) => {
              order.push('decoder');
              ctx.ingest.decoded = true;
              return { event };
            },
          }),
        },
        enricher: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: context.config,
            push: async (event, ctx) => {
              order.push('enricher');
              expect(ctx.ingest.decoded).toBe(true);
              return { event };
            },
          }),
        },
      },
      destinations: {
        d: {
          code: {
            type: 'test',
            config: {},
            push: async () => {},
          },
        },
      },
    });

    await collector.sources.testSource.push({ name: 'page view', data: {} });

    expect(order).toEqual(['decoder', 'enricher']);
  });

  it('before chain can modify the event', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          before: 'addData',
        },
      },
      transformers: {
        addData: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'addData',
            config: context.config,
            push: async (event) => ({
              event: { ...event, data: { ...event.data, added: true } },
            }),
          }),
        },
      },
      destinations: {
        d: {
          code: {
            type: 'test',
            config: {},
            push: async (event) => {
              destinationEvents.push(event);
            },
          },
        },
      },
    });

    await collector.sources.testSource.push({ name: 'page view', data: {} });

    expect(destinationEvents[0].data?.added).toBe(true);
  });

  it('before chain returning false stops the pipeline', async () => {
    let destinationCalled = false;

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          before: 'blocker',
        },
      },
      transformers: {
        blocker: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'blocker',
            config: context.config,
            push: async () => false as const, // Stop the chain
          }),
        },
      },
      destinations: {
        d: {
          code: {
            type: 'test',
            config: {},
            push: async () => {
              destinationCalled = true;
            },
          },
        },
      },
    });

    await collector.sources.testSource.push({ name: 'page view', data: {} });

    expect(destinationCalled).toBe(false);
  });
});
