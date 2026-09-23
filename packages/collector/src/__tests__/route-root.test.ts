import type {
  Collector,
  Destination,
  Source,
  Transformer,
  WalkerOS,
} from '@walkeros/core';
import { createIngest } from '@walkeros/core';
import { startFlow } from '..';

/**
 * R2: every route resolves with `{ ingest, event }`, the event the position
 * holds, per event and hop by hop.
 */

type Log = string[];

/** A transformer that logs its id plus the event name. */
function tagger(id: string, log: Log): Transformer.InitTransformer {
  return {
    code: async (context): Promise<Transformer.Instance> => ({
      type: id,
      config: context.config,
      push: (event) => {
        log.push(`${id}:${event.name}`);
        return { event };
      },
    }),
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

const onName = (value: string) => ({
  key: 'event.name',
  operator: 'eq' as const,
  value,
});

describe('source.next resolves per event with the event', () => {
  it('routes each event on event.name', async () => {
    const log: Log = [];
    const { collector } = await startFlow({
      sources: {
        web: testSource({
          next: {
            one: [{ match: onName('page view'), next: 'pages' }, 'other'],
          },
        }),
      },
      transformers: {
        pages: tagger('pages', log),
        other: tagger('other', log),
      },
    });

    await collector.sources.web.push({ name: 'page view' });
    await collector.sources.web.push({ name: 'order complete' });

    expect(log).toEqual(['pages:page view', 'other:order complete']);
  });

  it('gives every child of a source.before fork its own source.next route', async () => {
    const log: Log = [];
    const { collector } = await startFlow({
      sources: {
        web: testSource({
          before: 'split',
          next: {
            one: [{ match: onName('page view'), next: 'pages' }, 'other'],
          },
        }),
      },
      transformers: {
        split: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'split',
            config: context.config,
            push: (event) => [
              { event: { ...event, name: 'page view' } },
              { event: { ...event, name: 'order complete' } },
            ],
          }),
        },
        pages: tagger('pages', log),
        other: tagger('other', log),
      },
    });

    await collector.sources.web.push({ name: 'raw hit' });

    expect(log.sort()).toEqual(['other:order complete', 'pages:page view']);
  });

  it("sees a value the source's state wrote (D20)", async () => {
    const log: Log = [];
    const { collector } = await startFlow({
      sources: {
        web: testSource({
          config: {
            state: [
              { mode: 'set', key: { value: 'tier' }, value: 'event.data.tier' },
              { mode: 'get', key: { value: 'tier' }, value: 'ingest.tier' },
            ],
          },
          next: {
            one: [
              {
                match: { key: 'ingest.tier', operator: 'eq', value: 'gold' },
                next: 'gold',
              },
              'standard',
            ],
          },
        }),
      },
      transformers: {
        gold: tagger('gold', log),
        standard: tagger('standard', log),
      },
    });

    await collector.sources.web.push({
      name: 'page view',
      data: { tier: 'gold' },
    });

    expect(log).toEqual(['gold:page view']);
  });

  it('delivers N forks of a top-level many with distinct ids', async () => {
    const delivered: WalkerOS.Event[] = [];
    const log: Log = [];
    const { collector } = await startFlow({
      sources: { web: testSource({ next: { many: ['x', 'y'] } }) },
      transformers: { x: tagger('x', log), y: tagger('y', log) },
      destinations: { capture: capture(delivered) },
    });

    await collector.sources.web.push({ name: 'page view' });

    expect(log.sort()).toEqual(['x:page view', 'y:page view']);
    expect(delivered).toHaveLength(2);
    expect(new Set(delivered.map((event) => event.id)).size).toBe(2);
  });
});

describe('source.before resolves with the raw event', () => {
  it('matches on event.* of the source output', async () => {
    const log: Log = [];
    const { collector } = await startFlow({
      sources: {
        web: testSource({
          before: {
            one: [{ match: onName('raw hit'), next: 'parse' }, 'skip'],
          },
        }),
      },
      transformers: { parse: tagger('parse', log), skip: tagger('skip', log) },
    });

    await collector.sources.web.push({ name: 'raw hit' });

    expect(log).toEqual(['parse:raw hit']);
  });
});

describe('destination routes resolve per event with the event', () => {
  it('two queued events take different destination.before routes in one flush', async () => {
    const log: Log = [];
    const { collector, elb } = await startFlow({
      transformers: {
        pages: tagger('pages', log),
        other: tagger('other', log),
      },
      destinations: {
        gated: {
          code: {
            type: 'gated',
            config: {},
            push: async () => {},
          },
          config: { consent: { marketing: true } },
          before: {
            one: [{ match: onName('page view'), next: 'pages' }, 'other'],
          },
        },
      },
    });

    // Both events queue while consent is denied, then flush together.
    await elb('page view');
    await elb('order complete');
    expect(log).toEqual([]);
    await collector.command('consent', { marketing: true });

    expect(log.sort()).toEqual(['other:order complete', 'pages:page view']);
  });

  it('destination.next routes on event.* and on ingest._response', async () => {
    const log: Log = [];
    const { collector } = await startFlow({
      transformers: {
        byEvent: tagger('byEvent', log),
        byResponse: tagger('byResponse', log),
      },
      destinations: {
        eventRouted: {
          code: {
            type: 'eventRouted',
            config: {},
            push: async () => ({ status: 'accepted' }),
          },
          next: { match: onName('order complete'), next: 'byEvent' },
        },
        responseRouted: {
          code: {
            type: 'responseRouted',
            config: {},
            push: async () => ({ status: 'accepted' }),
          },
          next: {
            match: {
              key: 'ingest._response.status',
              operator: 'eq',
              value: 'accepted',
            },
            next: 'byResponse',
          },
        },
      },
    });

    await collector.push(
      { name: 'order complete' },
      { ingest: createIngest('src') },
    );

    expect(log.sort()).toEqual([
      'byEvent:order complete',
      'byResponse:order complete',
    ]);
  });

  it('a many in destination.before delivers N children with distinct ids to that destination only', async () => {
    const forked: WalkerOS.Event[] = [];
    const plain: WalkerOS.Event[] = [];
    const log: Log = [];
    const { elb } = await startFlow({
      transformers: { x: tagger('x', log), y: tagger('y', log) },
      destinations: {
        forked: { ...capture(forked), before: { many: ['x', 'y'] } },
        plain: capture(plain),
      },
    });

    await elb('page view');

    expect(forked).toHaveLength(2);
    expect(new Set(forked.map((event) => event.id)).size).toBe(2);
    expect(plain).toHaveLength(1);
  });
});
