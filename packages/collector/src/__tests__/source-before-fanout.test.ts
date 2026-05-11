import { startFlow } from '..';
import type { Source, Transformer, WalkerOS, Elb } from '@walkeros/core';

describe('source.before fan-out', () => {
  it('emits N events when a before-transformer returns an array of N events', async () => {
    const captured: WalkerOS.Event[] = [];

    const { collector } = await startFlow({
      sources: {
        testSource: {
          code: async (context): Promise<Source.Instance> => ({
            type: 'test',
            config: context.config as Source.Config,
            push: context.env.push as Elb.Fn,
          }),
          before: 'fanout',
        },
      },
      transformers: {
        fanout: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'fanout',
            config: context.config,
            push: async () => [
              { event: { name: 'a 1', entity: 'a', action: '1' } },
              { event: { name: 'a 2', entity: 'a', action: '2' } },
              { event: { name: 'a 3', entity: 'a', action: '3' } },
            ],
          }),
        },
      },
      destinations: {
        d: {
          code: {
            type: 'test',
            config: {},
            push: async (event) => {
              captured.push(event);
            },
          },
        },
      },
    });

    await collector.sources.testSource.push({
      name: 'wire payload',
      data: {},
    });

    expect(captured).toHaveLength(3);
    expect(captured.map((e) => e.name)).toEqual(['a 1', 'a 2', 'a 3']);
  });
});
