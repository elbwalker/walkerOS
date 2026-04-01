import { startFlow } from '..';
import type { Source, Transformer, Elb, Ingest } from '@walkeros/core';

describe('Destination ingest isolation', () => {
  it('each destination gets its own ingest clone', async () => {
    const ingestSnapshots: Record<string, Ingest> = {};

    const { collector } = await startFlow({
      sources: {
        s: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
        },
      },
      transformers: {
        tagA: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'tagA',
            config: context.config,
            push: async (event, ctx) => {
              ctx.ingest.taggedBy = 'A';
              ingestSnapshots.a = ctx.ingest;
              return { event };
            },
          }),
        },
        tagB: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'tagB',
            config: context.config,
            push: async (event, ctx) => {
              ctx.ingest.taggedBy = 'B';
              ingestSnapshots.b = ctx.ingest;
              return { event };
            },
          }),
        },
      },
      destinations: {
        destA: {
          code: { type: 'a', config: {}, push: async () => {} },
          before: 'tagA',
        },
        destB: {
          code: { type: 'b', config: {}, push: async () => {} },
          before: 'tagB',
        },
      },
    });

    await collector.sources.s.push({ name: 'page view', data: {} });

    expect(ingestSnapshots.a!.taggedBy).toBe('A');
    expect(ingestSnapshots.b!.taggedBy).toBe('B');
    // They should be different objects
    expect(ingestSnapshots.a).not.toBe(ingestSnapshots.b);
  });
});
