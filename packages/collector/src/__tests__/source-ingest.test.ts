import { startFlow } from '..';
import type { Source, Transformer, Elb, Ingest } from '@walkeros/core';

describe('Source setIngest creates typed Ingest', () => {
  it('creates Ingest with _meta from setIngest', async () => {
    let capturedIngest: Ingest | undefined;

    const { collector } = await startFlow({
      sources: {
        express: {
          config: {
            ingest: { map: { ip: 'ip', ua: { key: 'headers.user-agent' } } },
          },
          next: 'spy',
          code: async (context): Promise<Source.Instance> => {
            const { env, config, setIngest } = context;
            return {
              type: 'express',
              config: config as Source.Config,
              push: (async (rawData: unknown) => {
                await setIngest(rawData);
                await env.push({ name: 'page view', data: {} });
              }) as unknown as Elb.Fn,
            };
          },
        },
      },
      transformers: {
        spy: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'spy',
            config: context.config,
            push: async (event, ctx) => {
              capturedIngest = ctx.ingest;
              return { event };
            },
          }),
        },
      },
      destinations: {
        d: { code: { type: 'test', config: {}, push: async () => {} } },
      },
    });

    await collector.sources.express.push({
      ip: '1.2.3.4',
      headers: { 'user-agent': 'TestBot/1.0' },
    } as any);

    expect(capturedIngest).toBeDefined();
    expect(capturedIngest!._meta).toBeDefined();
    expect(capturedIngest!._meta.hops).toBe(1); // Incremented by spy transformer
    expect(capturedIngest!._meta.path[0]).toBe('express');
    expect(capturedIngest!._meta.path[1]).toBe('spy'); // Appended by runtime
    expect(capturedIngest!.ip).toBe('1.2.3.4');
    expect(capturedIngest!.ua).toBe('TestBot/1.0');
  });

  it('creates Ingest with _meta even without config.ingest mapping', async () => {
    let capturedIngest: Ingest | undefined;

    const { collector } = await startFlow({
      sources: {
        simple: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'simple',
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
              capturedIngest = ctx.ingest;
              return { event };
            },
          }),
        },
      },
      destinations: {
        d: { code: { type: 'test', config: {}, push: async () => {} } },
      },
    });

    await collector.sources.simple.push({ name: 'page view', data: {} });

    expect(capturedIngest).toBeDefined();
    expect(capturedIngest!._meta.path[0]).toBe('simple');
  });
});
