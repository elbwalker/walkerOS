import type {
  Collector,
  Ingest,
  Source,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { createIngest, createMockLogger, deriveSpanId } from '@walkeros/core';
import { routeCases } from '@walkeros/core/dev';
import { startFlow } from '..';
import { runTransformerChain } from '../transformer';

/**
 * The one chain runner, end to end with real transformers. Every case of the
 * shared route fixture runs through `collector.push` with the case's route
 * as the pre-collector chain; each transformer appends its id to
 * `data.path` and applies the case's ingest writes.
 */

const SEP = '>';

type TestTypes = Source.Types<unknown, unknown, Collector.PushFn>;

function pathOf(event: WalkerOS.DeepPartialEvent): string[] {
  const path = event.data?.path;
  return typeof path === 'string' && path !== '' ? path.split(SEP) : [];
}

function idsOf(routeCase: routeCases.RouteCase): string[] {
  const ids = new Set<string>();
  for (const perRoot of routeCase.expected)
    for (const copy of perRoot)
      for (const id of copy) if (id !== routeCases.STOP) ids.add(id);
  for (const id of Object.keys(routeCase.nexts || {})) ids.add(id);
  return [...ids];
}

/** Leaves of the run tree: the full visited list of every copy. */
function leaves(paths: string[][]): string[] {
  const keys = paths.map((path) => path.join(SEP));
  return keys
    .filter(
      (key) =>
        !keys.some((other) => other !== key && other.startsWith(key + SEP)),
    )
    .sort();
}

async function runCase(routeCase: routeCases.RouteCase, root: number) {
  const runs: string[][] = [];
  const delivered: WalkerOS.Event[] = [];
  const transformers: Transformer.InitTransformers = {};
  for (const id of idsOf(routeCase)) {
    const next = routeCase.nexts ? routeCase.nexts[id] : undefined;
    transformers[id] = {
      code: async (context): Promise<Transformer.Instance> => ({
        type: id,
        config: context.config,
        push: async (event, ctx) => {
          const path = [...pathOf(event), id];
          runs.push(path);
          const writes = routeCase.sets ? routeCase.sets[id] : undefined;
          if (writes) Object.assign(ctx.ingest, writes);
          return {
            event: { ...event, data: { ...event.data, path: path.join(SEP) } },
          };
        },
      }),
      ...(next !== undefined ? { next } : {}),
    };
  }
  const { collector } = await startFlow({
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
  const ingest: Ingest = {
    ...createIngest('src'),
    ...routeCase.roots[root].ingest,
  };
  await collector.push(
    { name: 'page view', data: { path: '' } },
    { id: 'src', ingest, preChain: routeCase.spec },
  );
  return { runs, delivered };
}

describe('the one chain runner (route fixture, end to end)', () => {
  for (const routeCase of routeCases.routeCases) {
    routeCase.roots.forEach((_, root) => {
      it(`${routeCase.name} (root ${root})`, async () => {
        const expected = routeCase.expected[root];
        const { runs, delivered } = await runCase(routeCase, root);

        // Every copy visited exactly the expected ids, stopped ones included.
        expect(leaves(runs)).toEqual(
          expected
            .map((copy) =>
              copy.filter((id) => id !== routeCases.STOP).join(SEP),
            )
            // A copy stopped before its first step leaves no run behind.
            .filter((key) => key !== '')
            .sort(),
        );

        // Only copies that did not stop reach the destination.
        expect(
          delivered.map((event) => pathOf(event).join(SEP)).sort(),
        ).toEqual(
          expected
            .filter((copy) => !copy.includes(routeCases.STOP))
            .map((copy) => copy.join(SEP))
            .sort(),
        );

        // Forks deliver under distinct ids.
        expect(new Set(delivered.map((event) => event.id)).size).toBe(
          delivered.length,
        );
      });
    });
  }
});

function createCollector(
  transformers: Transformer.Transformers,
): Collector.Instance {
  const noopPush: Collector.PushFn = async () => ({ ok: true });
  const noopCommand: Collector.CommandFn = async () => ({ ok: true });
  return {
    push: noopPush,
    command: noopCommand,
    elb: async () => ({ ok: true }),
    allowed: true,
    config: { globalsStatic: {}, sessionStatic: {} },
    consent: {},
    custom: {},
    sources: {},
    destinations: {},
    transformers,
    stores: {},
    globals: {},
    hooks: {},
    observers: new Set(),
    logger: createMockLogger(),
    on: {},
    queue: [],
    preRunQueue: [],
    round: 0,
    count: 0,
    stateVersion: 0,
    cellVersion: {},
    delivery: new WeakMap(),
    seenEvents: new Set(),
    session: undefined,
    status: {
      startedAt: 0,
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations: {},
      dropped: {},
      connectionErrors: {},
      breakers: {},
    },
    timing: 0,
    user: {},
    pending: { destinations: {} },
  };
}

function step(
  push: Transformer.Instance['push'],
  config: Transformer.Config = {},
): Transformer.Instance {
  return { type: 'step', config: { init: true, ...config }, push };
}

const pass: Transformer.Instance['push'] = (event) => ({ event });

function eventsOf(
  result: Transformer.ChainResult,
): WalkerOS.DeepPartialEvent[] {
  return result.copies.map((copy) => copy.event);
}

describe('fork identity', () => {
  const parent: WalkerOS.DeepPartialEvent = {
    id: 'parentid00000000',
    name: 'page view',
    source: { trace: 'trace-one' },
  };

  async function fork(): Promise<WalkerOS.DeepPartialEvent[]> {
    const transformers = { x: step(pass), y: step(pass) };
    return eventsOf(
      await runTransformerChain(
        createCollector(transformers),
        transformers,
        { many: ['x', 'y'] },
        parent,
      ),
    );
  }

  it('is deterministic, distinct and derived from the parent id', async () => {
    const first = await fork();
    const second = await fork();

    const ids = first.map((event) => event.id);
    expect(ids).toEqual([
      deriveSpanId('parentid00000000', 0),
      deriveSpanId('parentid00000000', 1),
    ]);
    expect(second.map((event) => event.id)).toEqual(ids);
    expect(new Set([...ids, parent.id]).size).toBe(3);
  });

  it('keeps the trace shared', async () => {
    const events = await fork();
    expect(events.map((event) => event.source?.trace)).toEqual([
      'trace-one',
      'trace-one',
    ]);
  });

  it('links each fork to its parent through ingest._meta.parentEventId', async () => {
    const seen: (string | undefined)[] = [];
    const record: Transformer.Instance['push'] = (event, context) => {
      seen.push(context.ingest._meta.parentEventId);
      return { event };
    };
    const transformers = { x: step(record), y: step(record) };
    await runTransformerChain(
      createCollector(transformers),
      transformers,
      { many: ['x', 'y'] },
      parent,
    );
    expect(seen).toEqual(['parentid00000000', 'parentid00000000']);
  });
});

describe('Result[] is a fork', () => {
  it('each result finishes the rest of the path with its own id', async () => {
    const tail: WalkerOS.DeepPartialEvent[] = [];
    const transformers = {
      split: step((event) => [
        { event: { ...event, name: 'a one' } },
        { event: { ...event, name: 'b two' } },
      ]),
      tail: step((event) => {
        tail.push(event);
        return { event };
      }),
    };
    const result = await runTransformerChain(
      createCollector(transformers),
      transformers,
      ['split', 'tail'],
      { id: 'parentid00000000', name: 'page view' },
    );

    expect(tail.map((event) => event.name).sort()).toEqual(['a one', 'b two']);
    expect(eventsOf(result).map((event) => event.id)).toEqual([
      deriveSpanId('parentid00000000', 0),
      deriveSpanId('parentid00000000', 1),
    ]);
  });

  it('a result with its own next runs that route, then the array continues', async () => {
    const order: string[] = [];
    const log =
      (id: string): Transformer.Instance['push'] =>
      (event) => {
        order.push(`${id}:${event.name}`);
        return { event };
      };
    const transformers = {
      split: step((event) => [
        { event: { ...event, name: 'one' }, next: 'side' },
        { event: { ...event, name: 'two' } },
      ]),
      side: step(log('side')),
      tail: step(log('tail')),
    };
    await runTransformerChain(
      createCollector(transformers),
      transformers,
      ['split', 'tail'],
      { id: 'p', name: 'page view' },
    );
    expect(order.sort()).toEqual(['side:one', 'tail:one', 'tail:two']);
  });
});

describe('stop ends the copy it applies to', () => {
  it('a stop in the start route: stopped, no owner', async () => {
    const transformers = { a: step(pass), b: step(pass) };
    const result = await runTransformerChain(
      createCollector(transformers),
      transformers,
      ['a', { stop: true }, 'b'],
      { name: 'page view' },
    );
    expect(result).toEqual({ copies: [], stopped: true });
  });

  it('a stop in a member next: dropped by that member', async () => {
    const transformers = {
      bot: step(pass, { next: { stop: true } }),
      b: step(pass),
    };
    const result = await runTransformerChain(
      createCollector(transformers),
      transformers,
      ['bot', 'b'],
      { name: 'page view' },
    );
    expect(result).toEqual({
      copies: [],
      stopped: true,
      droppedBy: 'bot',
    });
  });

  it('a stop in a result next: dropped by that member', async () => {
    const transformers = {
      router: step((event) => ({ event, next: { stop: true } })),
      b: step(pass),
    };
    const result = await runTransformerChain(
      createCollector(transformers),
      transformers,
      ['router', 'b'],
      { name: 'page view' },
    );
    expect(result).toEqual({
      copies: [],
      stopped: true,
      droppedBy: 'router',
    });
  });

  it('a stop in transformer.before: dropped by that transformer', async () => {
    const guarded = jest.fn(pass);
    const transformers = {
      guarded: step(guarded, {
        before: {
          match: { key: 'event.name', operator: 'eq', value: 'bot hit' },
          stop: true,
        },
      }),
    };
    const result = await runTransformerChain(
      createCollector(transformers),
      transformers,
      ['guarded'],
      { name: 'bot hit' },
    );
    expect(result).toEqual({
      copies: [],
      stopped: true,
      droppedBy: 'guarded',
    });
    expect(guarded).not.toHaveBeenCalled();
  });

  it('a stop in one fork leaves the sibling fork running', async () => {
    const transformers = { x: step(pass), y: step(pass), z: step(pass) };
    const result = await runTransformerChain(
      createCollector(transformers),
      transformers,
      [{ many: [['x', { stop: true }], 'y'] }, 'z'],
      { id: 'p', name: 'page view' },
    );
    expect(eventsOf(result)).toHaveLength(1);
  });
});

describe('lazy resolution (R4)', () => {
  async function run(flag: string | undefined) {
    const order: string[] = [];
    const transformers = {
      a: step((event, context) => {
        order.push('a');
        if (flag !== undefined) context.ingest.flag = flag;
        return { event };
      }),
      b: step((event) => {
        order.push('b');
        return { event };
      }),
    };
    await runTransformerChain(
      createCollector(transformers),
      transformers,
      [
        'a',
        {
          match: { key: 'ingest.flag', operator: 'eq', value: '1' },
          next: 'b',
        },
      ],
      { name: 'page view' },
      createIngest('src'),
    );
    return order;
  }

  it('a mixed sequence resolves its gate after the member before it ran', async () => {
    expect(await run('1')).toEqual(['a', 'b']);
    expect(await run(undefined)).toEqual(['a']);
  });
});

describe('path cap', () => {
  it('halts a copy past 256 steps', async () => {
    const transformers = { a: step(pass) };
    const collector = createCollector(transformers);
    const result = await runTransformerChain(
      collector,
      transformers,
      new Array<string>(300).fill('a'),
      { name: 'page view' },
    );
    expect(result.copies).toEqual([]);
    expect(collector.logger.error).toHaveBeenCalledWith(
      'Max path length exceeded at a',
    );
  });
});

describe('source.next through the source', () => {
  it('delivers every fork of a nested many with a distinct id', async () => {
    const delivered: WalkerOS.Event[] = [];
    const { collector } = await startFlow({
      sources: {
        web: {
          code: async (
            context: Source.Context<TestTypes>,
          ): Promise<Source.Instance<TestTypes>> => ({
            type: 'web',
            config: context.config,
            push: context.env.push,
          }),
          next: ['a', { many: ['x', 'y'] }],
        },
      },
      transformers: {
        a: { code: async (c) => ({ type: 'a', config: c.config, push: pass }) },
        x: { code: async (c) => ({ type: 'x', config: c.config, push: pass }) },
        y: { code: async (c) => ({ type: 'y', config: c.config, push: pass }) },
      },
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
    await collector.sources.web.push({ name: 'page view', data: {} });
    expect(delivered).toHaveLength(2);
    expect(new Set(delivered.map((event) => event.id)).size).toBe(2);
  });
});
