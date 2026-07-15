import type { Transformer, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';
import { runTransformerChain } from '../transformer';

describe('push chain-stop drops', () => {
  it('marks chain-stopped events as dropped in the push result', async () => {
    const pushA = jest.fn();

    const { collector } = await startFlow({
      transformers: {
        filter: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'filter',
            config: context.config,
            push: async (event) => {
              if (event.name === 'product view') return false;
              return { event };
            },
          }),
        },
      },
      destinations: {
        a: { code: { type: 'test', config: {}, push: pushA } },
      },
    });

    const result = await collector.push(
      { name: 'product view', data: { x: 1 } },
      { preChain: ['filter'] },
    );

    expect(result.ok).toBe(true);
    expect(result.dropped).toBe(true);
    expect(pushA).not.toHaveBeenCalled();
  });

  it('leaves dropped unset for delivered events', async () => {
    const pushA = jest.fn();

    const { collector } = await startFlow({
      transformers: {
        pass: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'pass',
            config: context.config,
            push: async (event) => ({ event }),
          }),
        },
      },
      destinations: {
        a: { code: { type: 'test', config: {}, push: pushA } },
      },
    });

    const result = await collector.push(
      { name: 'product view', data: { x: 1 } },
      { preChain: ['pass'] },
    );

    expect(result.ok).toBe(true);
    expect(result.dropped).toBeUndefined();
    expect(pushA).toHaveBeenCalled();
  });

  it('reports the dropping transformer on the chain result', async () => {
    const { collector } = await startFlow({});
    const mockPush = jest.fn().mockResolvedValue(false);
    const transformers: Transformer.Transformers = {
      filter: { type: 'filter', config: {}, push: mockPush },
    };
    const event: WalkerOS.DeepPartialEvent = { name: 'product view' };

    const chainResult = await runTransformerChain(
      collector,
      transformers,
      ['filter'],
      event,
    );

    expect(chainResult.event).toBeNull();
    expect(chainResult.droppedBy).toBe('filter');
  });
});
