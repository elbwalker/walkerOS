import type { Collector, Source, Transformer, WalkerOS } from '@walkeros/core';
import { createIngest, deriveSpanId } from '@walkeros/core';
import { startFlow } from '..';

/**
 * Fork copies are independent: each finishes the rest of the path with its
 * own event (deep copy), its own ingest, and a deterministic id owned by the
 * runner. Seat M findings I1, I2, I4, I5.
 */

type Push = Transformer.Instance['push'];
type TestTypes = Source.Types<unknown, unknown, Collector.PushFn>;

function transformer(id: string, push: Push): Transformer.InitTransformer {
  return {
    code: async (context): Promise<Transformer.Instance> => ({
      type: id,
      config: context.config,
      push,
    }),
  };
}

const pass: Push = (event) => ({ event });

function capture(delivered: WalkerOS.Event[]) {
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

const INPUT_ID = 'input00000000001';

describe('fork copies', () => {
  it('I1: each fork crosses into the next position with its own ingest', async () => {
    const seen: string[] = [];
    const tag =
      (tier: string): Push =>
      (event, context) => {
        context.ingest.tier = tier;
        return { event };
      };
    const { collector } = await startFlow({
      next: {
        one: [
          {
            match: { key: 'ingest.tier', operator: 'eq', value: 'gold' },
            next: 'gold',
          },
          {
            match: { key: 'ingest.tier', operator: 'eq', value: 'silver' },
            next: 'silver',
          },
        ],
      },
      transformers: {
        x: transformer('x', tag('gold')),
        y: transformer('y', tag('silver')),
        gold: transformer('gold', (event) => {
          seen.push('gold');
          return { event };
        }),
        silver: transformer('silver', (event) => {
          seen.push('silver');
          return { event };
        }),
      },
    });

    await collector.push(
      { id: INPUT_ID, name: 'page view' },
      {
        id: 'web',
        ingest: createIngest('web'),
        preChain: { many: ['x', 'y'] },
      },
    );

    expect(seen.sort()).toEqual(['gold', 'silver']);
  });

  it('I1: source.before forks reach source.next with their own ingest', async () => {
    const seen: string[] = [];
    const tag =
      (tier: string): Push =>
      (event, context) => {
        context.ingest.tier = tier;
        return { event };
      };
    const onTier = (value: string) => ({
      match: { key: 'ingest.tier', operator: 'eq' as const, value },
      next: value,
    });
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
          before: { many: ['x', 'y'] },
          next: { one: [onTier('gold'), onTier('silver')] },
        },
      },
      transformers: {
        x: transformer('x', tag('gold')),
        y: transformer('y', tag('silver')),
        gold: transformer('gold', (event) => {
          seen.push('gold');
          return { event };
        }),
        silver: transformer('silver', (event) => {
          seen.push('silver');
          return { event };
        }),
      },
    });

    await collector.sources.web.push({ name: 'page view' });

    expect(seen.sort()).toEqual(['gold', 'silver']);
  });

  it('I2: a fork editing its event in place never touches its sibling', async () => {
    const delivered: WalkerOS.Event[] = [];
    const redact: Push = (event) => {
      if (event.data) delete event.data.email;
      return { event };
    };
    const { collector } = await startFlow({
      transformers: {
        redact: transformer('redact', redact),
        keep: transformer('keep', pass),
      },
      destinations: { capture: capture(delivered) },
    });

    await collector.push(
      { id: INPUT_ID, name: 'user login', data: { email: 'a@b.c' } },
      { id: 'web', preChain: { many: ['redact', 'keep'] } },
    );

    expect(delivered).toHaveLength(2);
    expect(delivered.map((event) => event.data.email).sort()).toEqual([
      'a@b.c',
      undefined,
    ]);
  });

  it('I4: a collector.next step that removes a global stays removed', async () => {
    const delivered: WalkerOS.Event[] = [];
    const scrub: Push = (event) => {
      const globals = { ...event.globals };
      delete globals.secret;
      return { event: { ...event, globals } };
    };
    const { collector } = await startFlow({
      globals: { secret: 'token', site: 'shop' },
      next: 'scrub',
      transformers: { scrub: transformer('scrub', scrub) },
      destinations: { capture: capture(delivered) },
    });

    await collector.push({ id: INPUT_ID, name: 'page view' });

    expect(delivered).toHaveLength(1);
    expect(delivered[0].globals).toEqual({ site: 'shop' });
  });

  it('I5: a fork after a rebuilt event still gets a derived id', async () => {
    const delivered: WalkerOS.Event[] = [];
    const rebuild: Push = () => ({ event: { name: 'page view' } });
    const { collector } = await startFlow({
      transformers: {
        rebuild: transformer('rebuild', rebuild),
        x: transformer('x', pass),
        y: transformer('y', pass),
      },
      destinations: { capture: capture(delivered) },
    });

    await collector.push(
      { id: INPUT_ID, name: 'page view' },
      { id: 'web', preChain: ['rebuild', { many: ['x', 'y'] }] },
    );

    expect(delivered.map((event) => event.id).sort()).toEqual(
      [deriveSpanId(INPUT_ID, 0), deriveSpanId(INPUT_ID, 1)].sort(),
    );
  });
});
