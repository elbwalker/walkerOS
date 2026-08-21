// A destination-level `before` chain may fan one event into several. Every
// child must reach the destination: the chain's return type promises an array
// may come back, and the source-position chain honors that.
//
// Per-event ingest annotation is tracked separately: `destIngest._response`
// and the captured `response` keep their existing last-write-wins semantics
// across children, which this file deliberately does not change.

import { startFlow } from '..';
import { createRespond } from '@walkeros/core';
import type { Transformer, WalkerOS } from '@walkeros/core';

const forkInto = (count: number): Transformer.InitTransformers[string] => ({
  code: async (context): Promise<Transformer.Instance> => ({
    type: 'fork',
    config: context.config,
    push: async (event) =>
      Array.from({ length: count }, (_, index) => ({
        event: { ...event, data: { ...event.data, child: index } },
      })),
  }),
});

describe('destination before-chain fan-out', () => {
  it('pushes every child of a fan-out', async () => {
    const received: WalkerOS.Event[] = [];
    const { collector, elb } = await startFlow({
      transformers: { fork: forkInto(2) },
      destinations: {
        capture: {
          code: {
            type: 'test',
            config: {},
            push: async (event) => {
              received.push(event);
            },
          },
          before: ['fork'],
        },
      },
    });

    await elb('page view', {});
    await collector.command('shutdown');

    expect(received).toHaveLength(2);
  });

  it('gives each child its own values rather than copies of the first', async () => {
    const received: WalkerOS.Event[] = [];
    const { collector, elb } = await startFlow({
      transformers: { fork: forkInto(3) },
      destinations: {
        capture: {
          code: {
            type: 'test',
            config: {},
            push: async (event) => {
              received.push(event);
            },
          },
          before: ['fork'],
        },
      },
    });

    await elb('page view', {});
    await collector.command('shutdown');

    expect(received.map((event) => event.data.child)).toEqual([0, 1, 2]);
  });

  it('delivers siblings even when one child push throws', async () => {
    const received: WalkerOS.Event[] = [];
    const { collector, elb } = await startFlow({
      transformers: { fork: forkInto(3) },
      destinations: {
        capture: {
          code: {
            type: 'test',
            config: {},
            push: async (event) => {
              if (event.data.child === 1) throw new Error('child failed');
              received.push(event);
            },
          },
          before: ['fork'],
        },
      },
    });

    await elb('page view', {});
    await collector.command('shutdown');

    expect(received.map((event) => event.data.child)).toEqual([0, 2]);
  });

  // Pins an existing doctrine this fix must not change: respond is
  // first-call-wins, and a fan-out must not turn one request into N responses.
  it('keeps respond first-call-wins across children', async () => {
    const sender = jest.fn();
    const respond = createRespond(sender);

    const { collector } = await startFlow({
      transformers: { fork: forkInto(3) },
      destinations: {
        capture: {
          code: {
            type: 'test',
            config: {},
            push: async (event, context) => {
              context.env.respond?.({ body: { child: event.data.child } });
            },
          },
          before: ['fork'],
        },
      },
    });

    await collector.push({ name: 'page view' }, { respond });
    await collector.command('shutdown');

    expect(sender).toHaveBeenCalledTimes(1);
  });

  // Fan-out and the step-level destination cache interact: each child gets its
  // own cache decision, so two children sharing a key deliver once. Nothing
  // else covers that pair.
  it('gives each child its own step-level cache decision', async () => {
    const received: WalkerOS.Event[] = [];
    const { collector, elb } = await startFlow({
      // Fan one event into two children that share a cache key, so the second
      // child is deduplicated by the step-level check.
      transformers: {
        forkSame: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'fork',
            config: context.config,
            push: async (event) => [{ event }, { event }],
          }),
        },
      },
      destinations: {
        capture: {
          code: {
            type: 'test',
            config: {},
            push: async (event) => {
              received.push(event);
            },
          },
          before: ['forkSame'],
          cache: { stop: false, rules: [{ key: ['event.name'], ttl: 60 }] },
        },
      },
    });

    await elb('page view', {});
    await collector.command('shutdown');

    // Only the first child reaches the destination; the second is deduplicated.
    expect(received).toHaveLength(1);
  });
});
