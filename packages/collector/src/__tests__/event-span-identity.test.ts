import type { Collector, FlowState, WalkerOS } from '@walkeros/core';
import { Source, Transformer } from '@walkeros/core';
import { startFlow, createPushResult } from '..';

const SPAN_HEX = /^[0-9a-f]{16}$/;

type TestSourceTypes = Source.Types<unknown, unknown, Source.Push>;
type Flow = Awaited<ReturnType<typeof startFlow>>;

/**
 * A flow with one delivering destination and one consent-gated destination,
 * driven through `elb` so pushes carry no id, no source trace and no ingest
 * context: exactly what a web page load produces. The gated destination
 * contributes a `skip` record, so one event's record set covers in, out,
 * delivery and skip. Observers attach after startFlow, so only push-time
 * records are captured.
 */
async function buildFlow(): Promise<{
  collector: Flow['collector'];
  elb: Flow['elb'];
  captured: FlowState[];
  delivered: WalkerOS.Event[];
}> {
  const captured: FlowState[] = [];
  const delivered: WalkerOS.Event[] = [];
  const { collector, elb } = await startFlow({
    run: true,
    destinations: {
      collect: {
        code: {
          type: 'collect',
          config: {},
          push: async (event: WalkerOS.Event) => {
            delivered.push(event);
          },
        },
      },
      gated: {
        code: {
          type: 'gated',
          config: { consent: { marketing: true } },
          push: async () => {},
        },
      },
    },
  });
  collector.observers.add((state) => captured.push(state));
  return { collector, elb, captured, delivered };
}

/**
 * A flow whose source runs a `source.before` transformer chain. That chain
 * executes on the raw event BEFORE collector.push, so its records are the ones
 * that would stay anonymous if the span id were minted only at the collector
 * wrap.
 */
async function buildBeforeChainFlow(): Promise<{
  collector: Flow['collector'];
  captured: FlowState[];
}> {
  const captured: FlowState[] = [];
  const { collector } = await startFlow({
    run: true,
    sources: {
      web: {
        code: async (context): Promise<Source.Instance<TestSourceTypes>> => ({
          type: 'test',
          config: context.config as Source.Config<TestSourceTypes>,
          push: context.env.push,
        }),
        before: 'tagger',
      },
    },
    transformers: {
      tagger: {
        code: async (context): Promise<Transformer.Instance> => ({
          type: 'tagger',
          config: context.config,
          push: async (event) => ({ event }),
        }),
      },
    },
    destinations: {
      collect: {
        code: {
          type: 'collect',
          config: {},
          push: async () => {},
        },
      },
    },
  });
  collector.observers.add((state) => captured.push(state));
  return { collector, captured };
}

/**
 * A flow whose source runs one transformer at the given chain position, with
 * the transformer's push supplied per test. `before` runs inside the source
 * pipeline (source.ts), `next` runs inside collector.push (push.ts), so one
 * helper drives both chain-result sites.
 */
async function buildChainFlow(
  position: 'before' | 'next',
  push: Transformer.Instance['push'],
): Promise<{
  collector: Flow['collector'];
  captured: FlowState[];
  delivered: WalkerOS.Event[];
}> {
  const captured: FlowState[] = [];
  const delivered: WalkerOS.Event[] = [];
  const { collector } = await startFlow({
    run: true,
    sources: {
      web: {
        code: async (context): Promise<Source.Instance<TestSourceTypes>> => ({
          type: 'test',
          config: context.config as Source.Config<TestSourceTypes>,
          push: context.env.push,
        }),
        ...(position === 'before' ? { before: 'forker' } : { next: 'forker' }),
      },
    },
    transformers: {
      forker: {
        code: async (context): Promise<Transformer.Instance> => ({
          type: 'forker',
          config: context.config,
          push,
        }),
      },
    },
    destinations: {
      collect: {
        code: {
          type: 'collect',
          config: {},
          push: async (event: WalkerOS.Event) => {
            delivered.push(event);
          },
        },
      },
    },
  });
  collector.observers.add((state) => captured.push(state));
  return { collector, captured, delivered };
}

/**
 * The id the chain ran under: the transformer's own in record, which reads the
 * event handed to the chain. That is the id children inherit when a fork
 * spreads its input.
 */
function chainInputId(captured: FlowState[]): string | undefined {
  return captured.find(
    (state) => state.stepId === 'transformer.forker' && state.phase === 'in',
  )?.eventId;
}

/**
 * Records of a real event run carry the run trace. Destination lifecycle
 * frames (`init`) carry neither a trace nor an event id, so they are not part
 * of an event's record set.
 */
function eventRecords(captured: FlowState[]): FlowState[] {
  return captured.filter((state) => state.traceId);
}

describe('event span identity', () => {
  test('two events in one run share ONE run trace and get DISTINCT ids', async () => {
    const { collector, elb, captured } = await buildFlow();

    await elb('promotion start');
    await elb('promotion more');

    const ins = captured.filter(
      (s) => s.stepId === 'collector.push' && s.phase === 'in',
    );
    expect(ins).toHaveLength(2);
    // The span is minted before the in record exists, so neither in record is
    // anonymous and the two events cannot collapse into one journey.
    expect(ins[0]?.eventId).toMatch(SPAN_HEX);
    expect(ins[1]?.eventId).toMatch(SPAN_HEX);
    expect(ins[0]?.eventId).not.toBe(ins[1]?.eventId);
    // The trace stays run-scoped: both events belong to one collector run.
    expect(new Set(ins.map((s) => s.traceId))).toEqual(
      new Set([collector.trace]),
    );
  });

  test('every record of one event carries its id (in, out, delivery, skip)', async () => {
    const { collector, elb, captured, delivered } = await buildFlow();

    await elb('promotion start');

    const records = eventRecords(captured);
    // Presence first: a single-id count holds vacuously if a site stops
    // emitting or loses its trace.
    for (const stepId of [
      'collector.push',
      'destination.collect',
      'destination.gated',
    ]) {
      expect(records.some((s) => s.stepId === stepId)).toBe(true);
    }
    expect(
      records.filter((s) => s.stepId === 'collector.push').map((s) => s.phase),
    ).toEqual(['in', 'out']);
    expect(
      records.some(
        (s) => s.stepId === 'destination.gated' && s.phase === 'skip',
      ),
    ).toBe(true);

    const ids = new Set(records.map((s) => s.eventId));
    expect(ids.size).toBe(1);
    const [eventId] = [...ids];
    expect(eventId).toMatch(SPAN_HEX);
    // The id the records carry is the id the destination received.
    expect(delivered[0]?.id).toBe(eventId);
    expect(new Set(records.map((s) => s.traceId))).toEqual(
      new Set([collector.trace]),
    );
  });

  test('an incoming event.id is PRESERVED, not re-minted', async () => {
    const { elb, captured, delivered } = await buildFlow();

    await elb({ name: 'promotion start', id: 'incoming-span-id', data: {} });

    const ins = captured.filter(
      (s) => s.stepId === 'collector.push' && s.phase === 'in',
    );
    expect(ins[0]?.eventId).toBe('incoming-span-id');
    expect(delivered[0]?.id).toBe('incoming-span-id');
  });

  test('an incoming source.trace is PRESERVED, not re-minted', async () => {
    const { elb, captured } = await buildFlow();

    await elb('promotion start');
    await elb({
      name: 'promotion more',
      source: { type: 'web', trace: 'a'.repeat(32) },
    });

    const ins = captured.filter(
      (s) => s.stepId === 'collector.push' && s.phase === 'in',
    );
    expect(ins[ins.length - 1]?.traceId).toBe('a'.repeat(32));
  });

  test('a source.before chain carries the event id and the run trace', async () => {
    const { collector, captured } = await buildBeforeChainFlow();

    await collector.sources.web.push({ name: 'promotion start', data: {} });

    const records = eventRecords(captured);
    for (const stepId of [
      'transformer.tagger',
      'collector.push',
      'destination.collect',
    ]) {
      expect(records.some((s) => s.stepId === stepId)).toBe(true);
    }

    const ids = new Set(records.map((s) => s.eventId));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toMatch(SPAN_HEX);
    expect(new Set(records.map((s) => s.traceId))).toEqual(
      new Set([collector.trace]),
    );
  });

  test('a terminus receives the raw event: no id mint', async () => {
    const pushed: WalkerOS.DeepPartialEvent[] = [];
    const spyPush: Collector.PushFn = async (event) => {
      pushed.push(event);
      return createPushResult({ ok: true });
    };

    const { collector } = await startFlow({
      run: true,
      sources: {
        web: {
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => ({
            type: 'test',
            config: context.config as Source.Config<TestSourceTypes>,
            push: context.env.push,
          }),
          terminus: spyPush,
        },
      },
    });

    await collector.sources.web.push({ name: 'promotion start', data: {} });

    // A terminus replaces the collector and owns its own pipeline, so it
    // receives the event exactly as the caller wrote it. Step-example
    // artifacts depend on this: a minted id would make them non-deterministic.
    expect(pushed).toEqual([{ name: 'promotion start', data: {} }]);
  });

  // A fork that spreads its input (the idiomatic authoring style, see
  // transformer-fanout.test.ts) copies the chain input's id along with
  // everything else. Without a re-mint those children share one span and
  // collapse into a single journey. Any other fork shape passes these
  // vacuously.
  //
  // Width of what these pin: children never keep the CHAIN INPUT's id. They do
  // NOT pin "no two children share an id". A chain where one transformer
  // assigns an id and a later one spreads it still collapses, deliberately:
  // that id was chosen, not inherited, and the re-mint rule cannot tell it
  // from a legitimate per-child id. That case belongs to the GA4 `_p` ticket.
  describe.each([
    ['source.before', 'before'],
    ['collector preChain', 'next'],
  ] as const)('%s fan-out', (_label, position) => {
    test('children that spread the chain input are re-minted: none keeps its id', async () => {
      const { collector, captured, delivered } = await buildChainFlow(
        position,
        async (event) => [
          { event: { ...event, name: 'page view' } },
          { event: { ...event, name: 'session start' } },
        ],
      );

      await collector.sources.web.push({ name: 'wire payload', data: {} });

      const inputId = chainInputId(captured);
      expect(inputId).toMatch(SPAN_HEX);

      expect(delivered).toHaveLength(2);
      const childIds = delivered.map((event) => event.id);
      for (const id of childIds) expect(id).toMatch(SPAN_HEX);
      expect(new Set(childIds).size).toBe(2);
      expect(childIds).not.toContain(inputId);

      // Each child's records group under that child's own id.
      const destinationIds = captured
        .filter(
          (state) =>
            state.stepId === 'destination.collect' && state.phase === 'in',
        )
        .map((state) => state.eventId);
      expect(new Set(destinationIds)).toEqual(new Set(childIds));
    });

    test('children carrying their own distinct ids keep them', async () => {
      const { collector, delivered } = await buildChainFlow(
        position,
        async () => [
          { event: { name: 'a 1', entity: 'a', action: '1', id: 'child-one' } },
          { event: { name: 'a 2', entity: 'a', action: '2', id: 'child-two' } },
        ],
      );

      await collector.sources.web.push({ name: 'wire payload', data: {} });

      expect(new Set(delivered.map((event) => event.id))).toEqual(
        new Set(['child-one', 'child-two']),
      );
    });

    test('children built without an id get fresh distinct ids', async () => {
      const { collector, captured, delivered } = await buildChainFlow(
        position,
        async () => [
          { event: { name: 'a 1', entity: 'a', action: '1' } },
          { event: { name: 'a 2', entity: 'a', action: '2' } },
        ],
      );

      await collector.sources.web.push({ name: 'wire payload', data: {} });

      const inputId = chainInputId(captured);
      expect(inputId).toMatch(SPAN_HEX);

      const childIds = delivered.map((event) => event.id);
      expect(childIds).toHaveLength(2);
      for (const id of childIds) expect(id).toMatch(SPAN_HEX);
      expect(new Set(childIds).size).toBe(2);
      expect(childIds).not.toContain(inputId);
    });

    // Continuity: one result is the same logical event the chain received, so
    // the records emitted before the chain and the event after it must share
    // one id even when the transformer rebuilt the event from scratch.
    test('a single rebuilt result keeps the id the chain ran under', async () => {
      const { collector, captured, delivered } = await buildChainFlow(
        position,
        async () => ({
          event: { name: 'rebuilt event', entity: 'rebuilt', action: 'event' },
        }),
      );

      await collector.sources.web.push({ name: 'wire payload', data: {} });

      const inputId = chainInputId(captured);
      expect(inputId).toMatch(SPAN_HEX);

      const ids = new Set(eventRecords(captured).map((state) => state.eventId));
      expect(ids).toEqual(new Set([inputId]));
      expect(delivered).toHaveLength(1);
      expect(delivered[0]?.id).toBe(inputId);
    });
  });

  // `many` dispatches each branch as its own `collector.push` over the SAME
  // event, so every branch's chain runs under one id. Branches that rebuild the
  // event therefore all re-stamp that one id: N branches deliver under ONE id,
  // not N. That is a consequence of the continuity rule and it is intended,
  // `many` is one event fanned across pipelines rather than N events. Pinned
  // here because it is live behavior that nothing else covers.
  test('`many` branches that rebuild the event all deliver under the chain input id', async () => {
    const captured: FlowState[] = [];
    const delivered: WalkerOS.Event[] = [];
    const rebuild: Transformer.Instance['push'] = async () => ({
      event: { name: 'rebuilt event', entity: 'rebuilt', action: 'event' },
    });

    const { collector } = await startFlow({
      run: true,
      sources: {
        web: {
          code: async (context): Promise<Source.Instance<TestSourceTypes>> => ({
            type: 'test',
            config: context.config as Source.Config<TestSourceTypes>,
            push: context.env.push,
          }),
          next: { many: ['branchA', 'branchB'] },
        },
      },
      transformers: {
        branchA: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'branchA',
            config: context.config,
            push: rebuild,
          }),
        },
        branchB: {
          code: async (context): Promise<Transformer.Instance> => ({
            type: 'branchB',
            config: context.config,
            push: rebuild,
          }),
        },
      },
      destinations: {
        collect: {
          code: {
            type: 'collect',
            config: {},
            push: async (event: WalkerOS.Event) => {
              delivered.push(event);
            },
          },
        },
      },
    });
    collector.observers.add((state) => captured.push(state));

    await collector.sources.web.push({ name: 'wire payload', data: {} });

    // Both branches actually ran, so the id count below is not vacuous.
    for (const stepId of ['transformer.branchA', 'transformer.branchB']) {
      expect(captured.some((state) => state.stepId === stepId)).toBe(true);
    }

    // Every branch entered collector.push under the one source-minted id.
    const inputIds = new Set(
      captured
        .filter(
          (state) => state.stepId === 'collector.push' && state.phase === 'in',
        )
        .map((state) => state.eventId),
    );
    expect(inputIds.size).toBe(1);
    const [inputId] = [...inputIds];
    expect(inputId).toMatch(SPAN_HEX);

    // Both rebuilt branches deliver under that same id, not under two fresh
    // ones. Set size AND identity are asserted, so dropping the continuity
    // rule (which would mint one id per branch) fails this.
    expect(delivered).toHaveLength(2);
    expect(new Set(delivered.map((event) => event.id))).toEqual(
      new Set([inputId]),
    );
    expect(
      new Set(
        captured
          .filter(
            (state) =>
              state.stepId === 'destination.collect' && state.phase === 'in',
          )
          .map((state) => state.eventId),
      ),
    ).toEqual(new Set([inputId]));
  });
});
