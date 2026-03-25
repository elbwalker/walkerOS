import { startFlow } from '..';
import type { Source, Transformer, WalkerOS, Elb, Ingest } from '@walkeros/core';

describe('Ingest _meta tracking', () => {
  it('tracks hops and path through transformer chain', async () => {
    let finalIngest: Ingest | undefined;

    const { collector } = await startFlow({
      sources: {
        s: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          next: 'first',
        },
      },
      transformers: {
        first: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'first',
            config: context.config,
            push: async (event, ctx) => {
              expect(ctx.ingest._meta.hops).toBe(1);
              expect(ctx.ingest._meta.path).toContain('first');
              return { event };
            },
          }),
          next: 'second',
        },
        second: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'second',
            config: context.config,
            push: async (event, ctx) => {
              expect(ctx.ingest._meta.hops).toBe(2);
              expect(ctx.ingest._meta.path).toContain('second');
              finalIngest = ctx.ingest;
              return { event };
            },
          }),
        },
      },
      destinations: {
        d: { code: { type: 'test', config: {}, push: async () => {} } },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    expect(finalIngest).toBeDefined();
    expect(finalIngest!._meta.hops).toBe(2);
    expect(finalIngest!._meta.path).toContain('first');
    expect(finalIngest!._meta.path).toContain('second');
  });

  it('path starts with source ID', async () => {
    let capturedPath: string[] | undefined;

    const { collector } = await startFlow({
      sources: {
        mySource: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          next: 'spy',
        },
      },
      transformers: {
        spy: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'spy',
            config: context.config,
            push: async (event, ctx) => {
              capturedPath = [...ctx.ingest._meta.path];
              return { event };
            },
          }),
        },
      },
      destinations: {
        d: { code: { type: 'test', config: {}, push: async () => {} } },
      },
    });

    await collector.sources.mySource.push({ name: 'page view', data: {} });

    expect(capturedPath).toBeDefined();
    expect(capturedPath![0]).toBe('mySource');
  });
});
