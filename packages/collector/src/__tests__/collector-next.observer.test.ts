import type { FlowState, Transformer, WalkerOS } from '@walkeros/core';
import { startFlow } from '..';

/**
 * Observability of `collector.next`: its transformers run under the chain
 * path `collector.next`, and a drop emits the same collector `skip` /
 * `dropped` record as a drop at a source position.
 */

function step(
  id: string,
  seen: Array<string | undefined>,
  result: (event: WalkerOS.DeepPartialEvent) => Transformer.Result | false = (
    event,
  ) => ({ event }),
  definition: Partial<Transformer.InitTransformer> = {},
): Transformer.InitTransformer {
  return {
    code: async (context): Promise<Transformer.Instance> => ({
      type: id,
      config: context.config,
      push: (event, pushContext) => {
        seen.push(pushContext.ingest._meta.chainPath);
        return result(event);
      },
    }),
    ...definition,
  };
}

async function observed(
  next: Transformer.Route,
  transformers: Transformer.InitTransformers,
) {
  const states: FlowState[] = [];
  const delivered: WalkerOS.Event[] = [];
  const { collector } = await startFlow({
    next,
    transformers,
    destinations: {
      capture: {
        code: {
          type: 'capture',
          config: {},
          push: async (event: WalkerOS.Event) => {
            delivered.push(event);
          },
        },
      },
    },
  });
  collector.observers.add((state) => states.push(state));
  const result = await collector.push({ name: 'page view', data: {} });
  return { collector, states, delivered, result };
}

function collectorSkips(states: FlowState[]): FlowState[] {
  return states.filter(
    (state) => state.stepId === 'collector.push' && state.phase === 'skip',
  );
}

describe('collector.next observability', () => {
  it('runs its transformers under chainPath collector.next', async () => {
    const seen: Array<string | undefined> = [];
    const { states } = await observed(['a', 'b'], {
      a: step('a', seen),
      b: step('b', seen),
    });

    expect(seen).toEqual(['collector.next', 'collector.next']);
    const transformerIn = states.filter(
      (state) => state.stepType === 'transformer' && state.phase === 'in',
    );
    expect(transformerIn.map((state) => state.stepId)).toEqual([
      'transformer.a',
      'transformer.b',
    ]);
    expect(collectorSkips(states)).toHaveLength(0);
  });

  it('keys chainMocks on collector.next', async () => {
    const seen: Array<string | undefined> = [];
    const { delivered } = await observed('a', {
      a: step('a', seen, undefined, {
        config: {
          chainMocks: {
            'collector.next': { name: 'mocked event', data: {} },
          },
        },
      }),
    });

    expect(seen).toEqual([]);
    expect(delivered.map((event) => event.name)).toEqual(['mocked event']);
  });

  it('a transformer drop emits one collector skip attributed to it', async () => {
    const { states, collector, delivered } = await observed(['bot', 'a'], {
      bot: step('bot', [], () => false),
      a: step('a', []),
    });

    expect(delivered).toHaveLength(0);
    expect(collectorSkips(states)).toEqual([
      expect.objectContaining({
        stepType: 'collector',
        skipReason: 'dropped',
        meta: { by: 'bot', at: 'collector.next' },
      }),
    ]);
    expect(
      states.filter((state) => state.stepType === 'destination'),
    ).toHaveLength(0);
    expect(collector.status.in).toBe(1);
    expect(collector.status.out).toBe(0);
  });

  it('a route stop emits one collector skip attributed to the route', async () => {
    const { states, result } = await observed(['a', { stop: true }], {
      a: step('a', []),
    });

    expect(result).toMatchObject({ ok: true, dropped: true });
    const skips = collectorSkips(states);
    expect(skips).toHaveLength(1);
    expect(skips[0]).toMatchObject({
      skipReason: 'dropped',
      meta: { by: 'route', at: 'collector.next' },
    });
    expect(typeof skips[0].eventId).toBe('string');
    expect(skips[0].eventId).not.toBe('');
  });
});
