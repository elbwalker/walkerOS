import { startFlow } from '..';
import type { Source, Transformer, WalkerOS, Elb, Ingest } from '@walkeros/core';

describe('Mutable Ingest in push pipeline', () => {
  it('passes mutable Ingest through transformer chain', async () => {
    let capturedIngest: Ingest | undefined;

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          next: 'enricher',
        },
      },
      transformers: {
        enricher: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'enricher',
            config: context.config,
            push: async (event, ctx) => {
              ctx.ingest.enriched = true;
              ctx.ingest.score = 42;
              capturedIngest = ctx.ingest;
              return { event };
            },
          }),
        },
      },
      destinations: {
        testDest: {
          code: { type: 'test', config: {}, push: async () => {} },
        },
      },
    });

    await collector.sources.testSource.push({ name: 'page view', data: {} });

    expect(capturedIngest).toBeDefined();
    expect(capturedIngest!.enriched).toBe(true);
    expect(capturedIngest!.score).toBe(42);
    expect(capturedIngest!._meta).toBeDefined();
    expect(capturedIngest!._meta.path[0]).toBe('testSource');
  });
});
