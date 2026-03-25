import { startFlow } from '..';
import type { Source, Transformer, WalkerOS, Elb } from '@walkeros/core';

describe('Transformer fan-out (Result[])', () => {
  it('splits one event into multiple via Result[]', async () => {
    const destinationEvents: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          next: 'splitter',
        },
      },
      transformers: {
        splitter: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'splitter',
            config: context.config,
            push: async (event) => [
              { event: { ...event, name: 'page view' } },
              { event: { ...event, name: 'session start' } },
            ],
          }),
        },
      },
      destinations: {
        testDest: {
          code: {
            type: 'test',
            config: {},
            push: async (event) => { destinationEvents.push(event); },
          },
        },
      },
    });

    await collector.sources.testSource.push({ name: 'page view', data: { url: '/home' } });

    expect(destinationEvents.length).toBe(2);
    expect(destinationEvents.map((e) => e.name).sort()).toEqual(['page view', 'session start']);
  });

  it('each fork gets its own ingest clone', async () => {
    const ingestSnapshots: Record<string, unknown> = {};

    const { collector } = await startFlow({
      sources: {
        s: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          next: 'splitter',
        },
      },
      transformers: {
        splitter: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'splitter',
            config: context.config,
            push: async (event) => [
              { event: { ...event, name: 'fork a' } },
              { event: { ...event, name: 'fork b' } },
            ],
          }),
          next: 'tagger',
        },
        tagger: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'tagger',
            config: context.config,
            push: async (event, ctx) => {
              const tag = event.name === 'fork a' ? 'A' : 'B';
              ctx.ingest.tag = tag;
              ingestSnapshots[tag] = ctx.ingest;
              return { event };
            },
          }),
        },
      },
      destinations: {
        d: { code: { type: 'test', config: {}, push: async () => {} } },
      },
    });

    await collector.sources.s.push({ name: 'test', data: {} });

    // Each fork should have independent ingest
    expect(ingestSnapshots.A).toBeDefined();
    expect(ingestSnapshots.B).toBeDefined();
    expect((ingestSnapshots.A as any).tag).toBe('A');
    expect((ingestSnapshots.B as any).tag).toBe('B');
  });
});
