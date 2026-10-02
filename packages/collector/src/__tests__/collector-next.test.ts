import type {
  Collector,
  Destination,
  RespondFn,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { createRespond } from '@walkeros/core';
import { startFlow } from '..';
import { pushToDestinations } from '../destination';

/**
 * `collector.next`: the collector's own chain. It runs once per completed
 * event, before `collector.queue` and the destination fan-out, through the
 * one chain runner.
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
          return {
            event: {
              ...event,
              data: { ...event.data, via: [...viaOf(event), id].join(',') },
            },
          };
        }),
    }),
    ...definition,
  };
}

function viaOf(event: WalkerOS.DeepPartialEvent): string[] {
  const via = event.data?.via;
  return typeof via === 'string' && via !== '' ? via.split(',') : [];
}

function capture(
  delivered: WalkerOS.Event[],
  config: Destination.Config = {},
  definition: Partial<Destination.Init> = {},
): Destination.Init {
  return {
    code: {
      type: 'capture',
      config,
      push: async (event: WalkerOS.Event) => {
        delivered.push(event);
      },
    },
    ...definition,
  };
}

async function flow(
  next: Transformer.Route | undefined,
  transformers: Transformer.InitTransformers,
  extra: Partial<Collector.InitConfig> = {},
) {
  const first: WalkerOS.Event[] = [];
  const second: WalkerOS.Event[] = [];
  const { collector, elb } = await startFlow({
    next,
    transformers,
    destinations: { first: capture(first), second: capture(second) },
    ...extra,
  });
  return { collector, elb, first, second };
}

const pageView = { name: 'page view', data: {} };

describe('collector.next runtime', () => {
  it('is seeded into collector.config', async () => {
    const { collector } = await flow(['a'], { a: step('a', []) });
    expect(collector.config.next).toEqual(['a']);
  });

  it('runs once per event for all destinations', async () => {
    const log: Log = [];
    const { collector, first, second } = await flow('a', {
      a: step('a', log),
    });

    await collector.push(pageView);

    expect(log).toEqual(['a']);
    expect(first.map((event) => event.data.via)).toEqual(['a']);
    expect(second.map((event) => event.data.via)).toEqual(['a']);
    expect(first[0].id).toBe(second[0].id);
    expect(collector.status.in).toBe(1);
  });

  it.each<[string, Transformer.Route, string[]]>([
    ['a string', 'a', ['a']],
    ['a string[]', ['a', 'b'], ['a', 'b']],
    [
      'a matching gate on event.*',
      [
        {
          match: { key: 'event.name', operator: 'eq', value: 'page view' },
          next: 'a',
        },
        'b',
      ],
      ['a', 'b'],
    ],
    [
      'a failing gate on event.*',
      [
        {
          match: { key: 'event.name', operator: 'eq', value: 'order complete' },
          next: 'a',
        },
        'b',
      ],
      ['b'],
    ],
    [
      'a one on event.*',
      {
        one: [
          {
            match: { key: 'event.entity', operator: 'eq', value: 'page' },
            next: 'b',
          },
          { next: 'a' },
        ],
      },
      ['b'],
    ],
  ])('runs %s', async (_label, next, expected) => {
    const log: Log = [];
    const { collector, first } = await flow(next, {
      a: step('a', log),
      b: step('b', log),
    });

    await collector.push(pageView);

    expect(log).toEqual(expected);
    expect(first.map((event) => event.data.via)).toEqual([expected.join(',')]);
  });

  it("inserts a member's own next right after it", async () => {
    const log: Log = [];
    const { collector, first } = await flow(['a', 'b'], {
      a: step('a', log, { next: 'inserted' }),
      inserted: step('inserted', log),
      b: step('b', log),
    });

    await collector.push(pageView);

    expect(log).toEqual(['a', 'inserted', 'b']);
    expect(first).toHaveLength(1);
  });

  it('forks on many: each fork reaches every destination with its own id', async () => {
    const log: Log = [];
    const { collector, first, second } = await flow(
      [{ many: ['a', 'b'] }, 'tail'],
      { a: step('a', log), b: step('b', log), tail: step('tail', log) },
    );

    const result = await collector.push({ ...pageView, id: 'parent' });

    expect(log.filter((id) => id === 'tail')).toHaveLength(2);
    for (const delivered of [first, second]) {
      expect(delivered.map((event) => event.data.via).sort()).toEqual([
        'a,tail',
        'b,tail',
      ]);
      const ids = delivered.map((event) => event.id);
      expect(new Set(ids).size).toBe(2);
      expect(ids).not.toContain('parent');
    }
    expect(first.map((event) => event.id).sort()).toEqual(
      second.map((event) => event.id).sort(),
    );
    expect(result.ok).toBe(true);
  });

  it('a fork that stops contributes nothing; its sibling is delivered', async () => {
    const log: Log = [];
    const { collector, first } = await flow(
      { many: [['a', { stop: true }], 'b'] },
      { a: step('a', log), b: step('b', log) },
    );

    await collector.push(pageView);

    expect(first.map((event) => event.data.via)).toEqual(['b']);
  });

  it('a transformer returning false drops the event for all destinations', async () => {
    const { collector, first, second } = await flow(['bot', 'a'], {
      bot: step('bot', [], {}, () => false),
      a: step('a', []),
    });

    const result = await collector.push(pageView);

    expect(result).toMatchObject({ ok: true, dropped: true });
    expect(first).toHaveLength(0);
    expect(second).toHaveLength(0);
    expect(collector.status.in).toBe(1);
    expect(collector.status.out).toBe(0);
    expect(collector.queue).toHaveLength(0);
  });

  it('a route stop drops the event for all destinations', async () => {
    const log: Log = [];
    const { collector, first, second } = await flow(
      [
        'a',
        {
          match: { key: 'event.name', operator: 'eq', value: 'page view' },
          stop: true,
        },
        'b',
      ],
      { a: step('a', log), b: step('b', log) },
    );

    const result = await collector.push(pageView);

    expect(log).toEqual(['a']);
    expect(result).toMatchObject({ ok: true, dropped: true });
    expect(first).toHaveLength(0);
    expect(second).toHaveLength(0);
    expect(collector.status.in).toBe(1);
    expect(collector.status.out).toBe(0);
  });

  it('delivers Result[] fork children without re-running the chain', async () => {
    const log: Log = [];
    const { collector, first, second } = await flow('split', {
      split: step('split', log, {}, (event) => {
        log.push('split');
        return [
          { event: { ...event, data: { part: 1 } } },
          { event: { ...event, data: { part: 2 } } },
        ];
      }),
    });

    await collector.push({ ...pageView, id: 'parent' });

    expect(log).toEqual(['split']);
    for (const delivered of [first, second]) {
      expect(delivered.map((event) => event.data.part)).toEqual([1, 2]);
      expect(new Set(delivered.map((event) => event.id)).size).toBe(2);
    }
  });

  it('hands a wrapped respond to the destinations', async () => {
    const sender = jest.fn();
    const respond = createRespond(sender);
    let destinationRespond: RespondFn | undefined;

    const { collector } = await startFlow({
      next: 'wrapper',
      transformers: {
        wrapper: step('wrapper', [], {}, (event) => {
          const wrapped: RespondFn = (options) =>
            respond({ ...options, headers: { 'X-Chain': 'collector' } });
          return { event, respond: wrapped };
        }),
      },
      destinations: {
        responder: {
          code: {
            type: 'responder',
            config: {},
            push: async (_event, context) => {
              destinationRespond = context.env.respond;
              context.env.respond?.({ status: 202 });
            },
          },
        },
      },
    });

    await collector.push(pageView, { respond });

    expect(destinationRespond).toBeDefined();
    expect(destinationRespond).not.toBe(respond);
    expect(sender).toHaveBeenCalledWith({
      status: 202,
      headers: { 'X-Chain': 'collector' },
    });
  });

  it('flush calls without an event never run the chain', async () => {
    const log: Log = [];
    const { collector } = await flow('a', { a: step('a', log) });

    await pushToDestinations(collector);
    await collector.command('consent', { analytics: true });

    expect(log).toEqual([]);
  });

  it('include and exclude still narrow the destinations', async () => {
    const log: Log = [];
    const { collector, first, second } = await flow('a', {
      a: step('a', log),
    });

    await collector.push(pageView, { include: ['first'] });
    await collector.push(pageView, { exclude: ['first'] });

    expect(log).toEqual(['a', 'a']);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });

  it('does nothing without collector.next', async () => {
    const { collector, first } = await flow(undefined, {});
    const result = await collector.push({ ...pageView, id: 'same' });

    expect(first.map((event) => event.id)).toEqual(['same']);
    expect(result.ok).toBe(true);
  });
});

describe('collector.next runs exactly once across replays', () => {
  it('consent replay delivers the post-chain event without re-running', async () => {
    const log: Log = [];
    const delivered: WalkerOS.Event[] = [];
    const { collector } = await startFlow({
      next: 'a',
      transformers: { a: step('a', log) },
      destinations: {
        gated: capture(delivered, { consent: { marketing: true } }),
      },
    });

    await collector.push(pageView);
    expect(delivered).toHaveLength(0);

    await collector.command('consent', { marketing: true });

    expect(log).toEqual(['a']);
    expect(delivered.map((event) => event.data.via)).toEqual(['a']);
  });

  it('a required destination backfills post-chain events only', async () => {
    const log: Log = [];
    const delivered: WalkerOS.Event[] = [];
    const { collector } = await startFlow({
      next: [
        'a',
        {
          match: { key: 'event.name', operator: 'eq', value: 'bot detect' },
          stop: true,
        },
      ],
      transformers: { a: step('a', log) },
      destinations: {
        late: capture(delivered, {}, { config: { require: ['consent'] } }),
      },
    });

    await collector.push(pageView);
    await collector.push({ name: 'bot detect' });
    expect(delivered).toHaveLength(0);

    await collector.command('consent', { analytics: true });

    expect(log).toEqual(['a', 'a']);
    expect(delivered.map((event) => event.name)).toEqual(['page view']);
    expect(delivered[0].data.via).toBe('a');
  });

  it('a destination added later backfills without re-running', async () => {
    const log: Log = [];
    const delivered: WalkerOS.Event[] = [];
    const { collector } = await startFlow({
      next: 'a',
      transformers: { a: step('a', log) },
    });

    await collector.push(pageView);
    await collector.command('destination', capture(delivered));

    expect(log).toEqual(['a']);
    expect(delivered.map((event) => event.data.via)).toEqual(['a']);
  });

  it('a pre-run event runs the chain once on replay', async () => {
    const log: Log = [];
    const delivered: WalkerOS.Event[] = [];
    const { collector } = await startFlow({
      run: false,
      next: 'a',
      transformers: { a: step('a', log) },
      destinations: { capture: capture(delivered) },
    });

    await collector.push(pageView);
    expect(log).toEqual([]);

    await collector.command('run');

    expect(log).toEqual(['a']);
    expect(delivered.map((event) => event.data.via)).toEqual(['a']);
  });

  it('destination.before runs after it, per destination', async () => {
    const log: Log = [];
    const delivered: WalkerOS.Event[] = [];
    const { collector } = await startFlow({
      next: 'a',
      transformers: { a: step('a', log), d: step('d', log) },
      destinations: {
        capture: capture(delivered, {}, { before: 'd' }),
      },
    });

    await collector.push(pageView);

    expect(log).toEqual(['a', 'd']);
    expect(delivered.map((event) => event.data.via)).toEqual(['a,d']);
  });

  it('a cache.stop HIT halts delivery for every destination', async () => {
    const log: Log = [];
    const { collector, first, second } = await flow('dedup', {
      dedup: step('dedup', log, {
        cache: { stop: true, rules: [{ key: ['event.id'], ttl: 60 }] },
      }),
    });

    await collector.push({ ...pageView, id: 'evt-1' });
    await collector.push({ ...pageView, id: 'evt-1' });
    await collector.push({ ...pageView, id: 'evt-2' });

    expect(first.map((event) => event.id)).toEqual(['evt-1', 'evt-2']);
    expect(second.map((event) => event.id)).toEqual(['evt-1', 'evt-2']);
  });

  it('walker config swaps the chain for later events', async () => {
    const log: Log = [];
    const { collector, first } = await flow(['a', 'b'], {
      a: step('a', log),
      b: step('b', log),
      c: step('c', log),
    });

    await collector.push(pageView);
    await collector.command('config', { next: ['c'] });
    await collector.push(pageView);

    expect(collector.config.next).toEqual(['c']);
    expect(log).toEqual(['a', 'b', 'c']);
    expect(first.map((event) => event.data.via)).toEqual(['a,b', 'c']);
  });
});
