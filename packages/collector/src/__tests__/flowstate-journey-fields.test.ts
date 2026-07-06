import type { FlowState, Transformer, WalkerOS } from '@walkeros/core';
import { createIngest } from '@walkeros/core';
import { startFlow } from '..';

const TRACE_HEX = /^[0-9a-f]{32}$/;

// A flow with one pass-through transformer and one no-op destination so a
// single push produces collector.push, transformer.tagger, and
// destination.collect records that a test observer can inspect. The
// destination captures each delivered event so tests can assert the event
// identity (e.g. source.trace) the collector stamped.
async function buildFlow(): Promise<{
  collector: Awaited<ReturnType<typeof startFlow>>['collector'];
  states: FlowState[];
  pushed: WalkerOS.Event[];
}> {
  const states: FlowState[] = [];
  const pushed: WalkerOS.Event[] = [];
  const { collector } = await startFlow({
    run: true,
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
          push: async (event: WalkerOS.Event) => {
            pushed.push(event);
          },
        },
      },
    },
  });
  collector.observers.add((state) => states.push(state));
  return { collector, states, pushed };
}

function pick(
  states: FlowState[],
  stepId: string,
  phase: FlowState['phase'],
): FlowState | undefined {
  return states.find((s) => s.stepId === stepId && s.phase === phase);
}

describe('FlowState journey fields', () => {
  test('collector.push in/out records carry sourceId and a 32-hex traceId', async () => {
    const { collector, states } = await buildFlow();

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web'), preChain: ['tagger'] },
    );

    const cin = pick(states, 'collector.push', 'in');
    const cout = pick(states, 'collector.push', 'out');
    expect(cin?.sourceId).toBe('web');
    expect(cout?.sourceId).toBe('web');
    expect(cin?.traceId).toMatch(TRACE_HEX);
    expect(cout?.traceId).toMatch(TRACE_HEX);
  });

  test('a preset source.trace is stamped verbatim on every hop', async () => {
    const { collector, states } = await buildFlow();
    const trace = 'abcdef0123456789abcdef0123456789';

    await collector.push(
      { name: 'page view', data: {}, source: { type: 'web', trace } },
      { id: 'web', ingest: createIngest('web'), preChain: ['tagger'] },
    );

    expect(pick(states, 'collector.push', 'in')?.traceId).toBe(trace);
    expect(pick(states, 'transformer.tagger', 'in')?.traceId).toBe(trace);
    expect(pick(states, 'destination.collect', 'in')?.traceId).toBe(trace);
  });

  test('ingest _meta.parentEventId reaches transformer and destination records', async () => {
    const { collector, states } = await buildFlow();
    const parentEventId = '0123456789abcdef';
    const ingest = createIngest('web');
    ingest._meta.parentEventId = parentEventId;

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest, preChain: ['tagger'] },
    );

    expect(pick(states, 'transformer.tagger', 'in')?.parentEventId).toBe(
      parentEventId,
    );
    expect(pick(states, 'destination.collect', 'in')?.parentEventId).toBe(
      parentEventId,
    );
  });

  test('transformer and destination in/out records carry sourceId and traceId', async () => {
    const { collector, states } = await buildFlow();

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest: createIngest('web'), preChain: ['tagger'] },
    );

    for (const stepId of ['transformer.tagger', 'destination.collect']) {
      for (const phase of ['in', 'out'] as const) {
        const state = pick(states, stepId, phase);
        expect(state?.sourceId).toBe('web');
        expect(state?.traceId).toMatch(TRACE_HEX);
      }
    }
  });

  test('an ingest _meta.trace fills in when the event has no source.trace', async () => {
    const { collector, states, pushed } = await buildFlow();
    const ingestTrace = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const ingest = createIngest('web');
    ingest._meta.trace = ingestTrace;

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest, preChain: ['tagger'] },
    );

    // The created event adopts the header-derived ingest trace.
    expect(pushed[0]?.source.trace).toBe(ingestTrace);
    // And every hop's record stamps that same trace.
    expect(pick(states, 'collector.push', 'in')?.traceId).toBe(ingestTrace);
    expect(pick(states, 'transformer.tagger', 'in')?.traceId).toBe(ingestTrace);
    expect(pick(states, 'destination.collect', 'in')?.traceId).toBe(
      ingestTrace,
    );
  });

  test('a payload source.trace wins over a differing ingest _meta.trace everywhere', async () => {
    const { collector, states, pushed } = await buildFlow();
    const payloadTrace = 'abcdef0123456789abcdef0123456789';
    const ingestTrace = '11111111111111111111111111111111';
    const ingest = createIngest('web');
    ingest._meta.trace = ingestTrace;

    await collector.push(
      {
        name: 'page view',
        data: {},
        source: { type: 'web', trace: payloadTrace },
      },
      { id: 'web', ingest, preChain: ['tagger'] },
    );

    expect(pushed[0]?.source.trace).toBe(payloadTrace);
    expect(pick(states, 'collector.push', 'in')?.traceId).toBe(payloadTrace);
    expect(pick(states, 'transformer.tagger', 'in')?.traceId).toBe(
      payloadTrace,
    );
    expect(pick(states, 'destination.collect', 'in')?.traceId).toBe(
      payloadTrace,
    );
  });

  test('ingest _meta.parentEventId reaches collector.push in/out records', async () => {
    const { collector, states } = await buildFlow();
    const parentEventId = '0123456789abcdef';
    const ingest = createIngest('web');
    ingest._meta.parentEventId = parentEventId;

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest, preChain: ['tagger'] },
    );

    expect(pick(states, 'collector.push', 'in')?.parentEventId).toBe(
      parentEventId,
    );
    expect(pick(states, 'collector.push', 'out')?.parentEventId).toBe(
      parentEventId,
    );
  });

  test('a preset source.trace survives verbatim on the out phase too', async () => {
    const { collector, states } = await buildFlow();
    const trace = 'abcdef0123456789abcdef0123456789';

    await collector.push(
      { name: 'page view', data: {}, source: { type: 'web', trace } },
      { id: 'web', ingest: createIngest('web'), preChain: ['tagger'] },
    );

    expect(pick(states, 'collector.push', 'out')?.traceId).toBe(trace);
    expect(pick(states, 'transformer.tagger', 'out')?.traceId).toBe(trace);
    expect(pick(states, 'destination.collect', 'out')?.traceId).toBe(trace);
  });

  test('an error-phase destination record carries the journey trio', async () => {
    const states: FlowState[] = [];
    const parentEventId = '0123456789abcdef';
    const { collector } = await startFlow({
      run: true,
      destinations: {
        boom: {
          code: {
            type: 'boom',
            config: {},
            push: async () => {
              throw new Error('nope');
            },
          },
        },
      },
    });
    collector.observers.add((state) => states.push(state));

    const ingest = createIngest('web');
    ingest._meta.parentEventId = parentEventId;

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest },
    );

    const err = pick(states, 'destination.boom', 'error');
    expect(err?.sourceId).toBe('web');
    expect(err?.parentEventId).toBe(parentEventId);
    expect(err?.traceId).toMatch(TRACE_HEX);
  });

  test('a batch flush record carries the representative traceId and sourceId', async () => {
    jest.useFakeTimers();
    try {
      const states: FlowState[] = [];
      const { collector } = await startFlow({
        run: true,
        destinations: {
          batched: {
            code: {
              type: 'batched',
              push: async () => undefined,
              pushBatch: async () => undefined,
              config: {
                mapping: {
                  '*': { '*': { batch: { wait: 1 } } },
                },
              },
            },
          },
        },
      });
      collector.observers.add((state) => states.push(state));

      await collector.push(
        { name: 'page view', data: {} },
        { id: 'web', ingest: createIngest('web') },
      );
      // Advance past the debounce window so the batch flushes.
      await jest.advanceTimersByTimeAsync(10);

      const flush = pick(states, 'destination.batched', 'flush');
      expect(flush).toBeDefined();
      expect(flush?.traceId).toMatch(TRACE_HEX);
      expect(flush?.sourceId).toBe('web');
    } finally {
      jest.useRealTimers();
    }
  });

  test('a consent-skip record carries the journey trio', async () => {
    const states: FlowState[] = [];
    const parentEventId = '0123456789abcdef';
    const { collector } = await startFlow({
      run: true,
      destinations: {
        gated: {
          code: {
            type: 'gated',
            config: {},
            push: async () => {},
          },
          config: { consent: { marketing: true } },
        },
      },
    });
    collector.observers.add((state) => states.push(state));

    const ingest = createIngest('web');
    ingest._meta.parentEventId = parentEventId;

    await collector.push(
      { name: 'page view', data: {} },
      { id: 'web', ingest },
    );

    const skip = pick(states, 'destination.gated', 'skip');
    expect(skip).toBeDefined();
    expect(skip?.skipReason).toBe('consent');
    expect(skip?.traceId).toMatch(TRACE_HEX);
    expect(skip?.sourceId).toBe('web');
    expect(skip?.parentEventId).toBe(parentEventId);
  });
});
