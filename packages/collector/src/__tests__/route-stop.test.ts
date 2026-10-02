import type {
  Collector,
  Destination,
  Elb,
  FlowState,
  Source,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { createIngest } from '@walkeros/core';
import { startFlow } from '..';

/**
 * What a resolved `stop` means at each position (one test per row of the
 * stop table). Drops at collector-owned positions emit one collector
 * `skip` / `dropped`; a `destination.before` stop is a destination skip.
 */

type Log = string[];

function step(
  id: string,
  log: Log,
  definition: Partial<Transformer.InitTransformer> = {},
  push?: Transformer.Instance['push'],
): Transformer.InitTransformer {
  return {
    code: async (context): Promise<Transformer.Instance> => ({
      type: id,
      config: context.config,
      push:
        push ??
        ((event) => {
          log.push(id);
          return { event };
        }),
    }),
    ...definition,
  };
}

type TestTypes = Source.Types<unknown, unknown, Collector.PushFn>;

function testSource(
  definition: Partial<Source.InitSource<TestTypes>> = {},
): Source.InitSource<TestTypes> {
  return {
    code: async (context): Promise<Source.Instance<TestTypes>> => ({
      type: 'test',
      config: context.config,
      push: context.env.push,
    }),
    ...definition,
  };
}

function capture(delivered: WalkerOS.Event[]): Destination.Init {
  return {
    code: {
      type: 'capture',
      config: {},
      push: async (event: WalkerOS.Event) => {
        delivered.push(event);
      },
    },
  };
}

function collectorDrops(states: FlowState[]): FlowState[] {
  return states.filter(
    (state) => state.stepId === 'collector.push' && state.phase === 'skip',
  );
}

async function sourceFlow(
  source: Partial<Source.InitSource<TestTypes>>,
  transformers: Transformer.InitTransformers,
) {
  const delivered: WalkerOS.Event[] = [];
  const states: FlowState[] = [];
  const { collector } = await startFlow({
    sources: { web: testSource(source) },
    transformers,
    destinations: { capture: capture(delivered) },
  });
  collector.observers.add((state) => states.push(state));
  const result: Elb.PushResult = await collector.sources.web.push({
    name: 'page view',
  });
  return { collector, delivered, states, result };
}

describe('stop per position', () => {
  it('source.next: the event never reaches the collector', async () => {
    const log: Log = [];
    const { collector, delivered, states, result } = await sourceFlow(
      { next: ['a', { stop: true }, 'b'] },
      { a: step('a', log), b: step('b', log) },
    );

    expect(log).toEqual(['a']);
    expect(delivered).toHaveLength(0);
    expect(result).toMatchObject({ ok: true, dropped: true });
    const [drop] = collectorDrops(states);
    expect(drop).toMatchObject({
      stepType: 'collector',
      skipReason: 'dropped',
      meta: { by: 'route', at: 'source.web.next' },
    });
    expect(collectorDrops(states)).toHaveLength(1);
    expect(collector.status.in).toBe(1);
    expect(collector.status.out).toBe(0);
  });

  it('source.before: the event never reaches the collector', async () => {
    const log: Log = [];
    const { delivered, states, result } = await sourceFlow(
      {
        before: {
          match: { key: 'event.name', operator: 'eq', value: 'page view' },
          stop: true,
        },
      },
      { a: step('a', log) },
    );

    expect(delivered).toHaveLength(0);
    expect(result).toMatchObject({ ok: true, dropped: true });
    expect(collectorDrops(states)).toEqual([
      expect.objectContaining({
        skipReason: 'dropped',
        meta: { by: 'route', at: 'source.web.before' },
      }),
    ]);
  });

  it('transformer.next in a pre-collector chain: dropped by that transformer', async () => {
    const log: Log = [];
    const { delivered, states } = await sourceFlow(
      { next: ['bot', 'b'] },
      {
        bot: step('bot', log, { next: { stop: true } }),
        b: step('b', log),
      },
    );

    expect(log).toEqual(['bot']);
    expect(delivered).toHaveLength(0);
    expect(collectorDrops(states)[0]?.meta).toEqual({
      by: 'bot',
      at: 'source.web.next',
    });
  });

  it('transformer.next in a post-collector chain: that destination skips', async () => {
    const log: Log = [];
    const delivered: WalkerOS.Event[] = [];
    const states: FlowState[] = [];
    const { collector, elb } = await startFlow({
      transformers: {
        bot: step('bot', log, { next: { stop: true } }),
        b: step('b', log),
      },
      destinations: {
        capture: { ...capture(delivered), before: ['bot', 'b'] },
      },
    });
    collector.observers.add((state) => states.push(state));

    await elb('page view');

    expect(log).toEqual(['bot']);
    expect(delivered).toHaveLength(0);
    expect(
      states.find(
        (state) =>
          state.stepId === 'destination.capture' && state.phase === 'skip',
      ),
    ).toMatchObject({
      skipReason: 'dropped',
      meta: { by: 'bot', at: 'destination.capture.before' },
    });
  });

  it('transformer.before: the running copy ends, dropped by that transformer', async () => {
    const log: Log = [];
    const { delivered, states } = await sourceFlow(
      { next: 'guarded' },
      {
        guarded: step('guarded', log, { before: { stop: true } }),
      },
    );

    expect(log).toEqual([]);
    expect(delivered).toHaveLength(0);
    expect(collectorDrops(states)[0]?.meta).toEqual({
      by: 'guarded',
      at: 'source.web.next',
    });
  });

  it('a transformer result { next }: dropped by that transformer', async () => {
    const log: Log = [];
    const { delivered, states } = await sourceFlow(
      { next: ['router', 'b'] },
      {
        router: step('router', log, {}, (event) => ({
          event,
          next: { stop: true },
        })),
        b: step('b', log),
      },
    );

    expect(log).toEqual([]);
    expect(delivered).toHaveLength(0);
    expect(collectorDrops(states)[0]?.meta).toEqual({
      by: 'router',
      at: 'source.web.next',
    });
  });

  it('destination.before: A skips the event, B receives it', async () => {
    const skipped: WalkerOS.Event[] = [];
    const received: WalkerOS.Event[] = [];
    const states: FlowState[] = [];
    const { collector, elb } = await startFlow({
      destinations: {
        a: { ...capture(skipped), before: { stop: true } },
        b: capture(received),
      },
    });
    collector.observers.add((state) => states.push(state));

    await elb('page view');

    expect(skipped).toHaveLength(0);
    expect(received).toHaveLength(1);
    const skips = states.filter((state) => state.phase === 'skip');
    expect(skips).toEqual([
      expect.objectContaining({
        stepId: 'destination.a',
        skipReason: 'dropped',
        meta: { by: 'route', at: 'destination.a.before' },
      }),
    ]);
  });

  it('destination.next: delivery already happened, the chain ends', async () => {
    const log: Log = [];
    const delivered: WalkerOS.Event[] = [];
    const { collector } = await startFlow({
      transformers: { after: step('after', log), never: step('never', log) },
      destinations: {
        capture: {
          ...capture(delivered),
          next: ['after', { stop: true }, 'never'],
        },
      },
    });

    await collector.push(
      { name: 'page view' },
      { ingest: createIngest('src') },
    );

    expect(delivered).toHaveLength(1);
    expect(log).toEqual(['after']);
  });
});
