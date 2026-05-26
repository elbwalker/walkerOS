import { useHooks } from '../useHooks';
import { createTelemetryHooks, isSampled } from '../telemetry';
import type { FlowState } from '../types/telemetry';

const FLOW_ID = 'default';

function makeEmit() {
  const states: FlowState[] = [];
  return { states, emit: (s: FlowState) => states.push(s) };
}

describe('createTelemetryHooks: collector Push pair', () => {
  test('emits in+out for a successful push', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, {
      flowId: FLOW_ID,
      startedAt: 1000,
    });

    const push = async (event: { id: string; name: string }) => ({
      ok: true,
      event: event.name,
    });
    const wrapped = useHooks(push, 'Push', hooks);
    await wrapped({ id: 'abc', name: 'page view' });

    expect(states.length).toBe(2);
    expect(states[0].phase).toBe('in');
    expect(states[0].stepId).toBe('collector.push');
    expect(states[0].stepType).toBe('collector');
    expect(states[0].eventId).toBe('abc');
    expect(states[0].flowId).toBe(FLOW_ID);
    expect(states[1].phase).toBe('out');
    expect(states[1].eventId).toBe('abc');
    expect(typeof states[1].durationMs).toBe('number');
  });

  test('emits in+error when wrapped fn throws', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID });

    const push = async (_event: { id: string }) => {
      throw new Error('kaboom');
    };
    const wrapped = useHooks(push, 'Push', hooks);
    await expect(wrapped({ id: 'evt-err' })).rejects.toThrow('kaboom');

    // Wait one microtask so the async settle has a chance to emit.
    await Promise.resolve();

    const errStates = states.filter((s) => s.eventId === 'evt-err');
    expect(errStates.length).toBe(2);
    expect(errStates[0].phase).toBe('in');
    expect(errStates[1].phase).toBe('error');
    expect(errStates[1].error?.message).toBe('kaboom');
  });

  test('honors includeIn=false (strips inEvent)', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, {
      flowId: FLOW_ID,
      level: 'trace',
      includeIn: false,
    });

    const push = async (event: { id: string }) => ({ ok: true });
    const wrapped = useHooks(push, 'Push', hooks);
    await wrapped({ id: 'no-in' });

    const inState = states.find((s) => s.phase === 'in');
    expect(inState).toBeDefined();
    expect(inState!.inEvent).toBeUndefined();
    // outEvent should still be present because level=trace forces includeOut.
    const outState = states.find((s) => s.phase === 'out');
    expect(outState!.outEvent).toBeDefined();
  });

  test('respects sample<1.0 deterministically', () => {
    // Pick two ids with known different hash buckets.
    const ids = Array.from({ length: 1000 }, (_, i) => `evt-${i}`);
    const sample = 0.5;
    const passes = ids.filter((id) => isSampled(id, sample));
    // Every call with the same id returns the same answer.
    for (const id of ids) {
      const a = isSampled(id, sample);
      const b = isSampled(id, sample);
      expect(a).toBe(b);
    }
    // Across 1000 ids at 0.5, count should be roughly half. Allow generous
    // bounds so the test stays stable across hash distributions.
    expect(passes.length).toBeGreaterThan(300);
    expect(passes.length).toBeLessThan(700);
  });

  test('returns empty hooks object when level=off', () => {
    const { emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, {
      flowId: FLOW_ID,
      level: 'off',
    });
    expect(Object.keys(hooks)).toHaveLength(0);
  });
});

describe('createTelemetryHooks: destination hooks', () => {
  test('init emits a single init state', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID });

    const init = async (_ctx: { id: string }) => undefined;
    const wrapped = useHooks(init, 'DestinationInit', hooks);
    await wrapped({ id: 'gtag' });

    const initStates = states.filter((s) => s.phase === 'init');
    expect(initStates.length).toBe(1);
    expect(initStates[0].stepId).toBe('destination.gtag');
    expect(initStates[0].stepType).toBe('destination');
  });

  test('push success emits in+out', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID });

    const push = async (_event: { id: string }, _ctx: { id: string }) => ({
      ok: true,
    });
    const wrapped = useHooks(push, 'DestinationPush', hooks);
    await wrapped({ id: 'evt-1' }, { id: 'gtag' });

    expect(states.length).toBe(2);
    expect(states[0].phase).toBe('in');
    expect(states[0].stepId).toBe('destination.gtag');
    expect(states[1].phase).toBe('out');
    expect(states[1].stepId).toBe('destination.gtag');
  });

  test('push reject emits in+error', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID });

    const push = async (_event: { id: string }, _ctx: { id: string }) => {
      throw new Error('dest exploded');
    };
    const wrapped = useHooks(push, 'DestinationPush', hooks);
    await expect(wrapped({ id: 'evt-2' }, { id: 'gtag' })).rejects.toThrow(
      'dest exploded',
    );
    await Promise.resolve();

    const errStates = states.filter((s) => s.phase === 'error');
    expect(errStates.length).toBe(1);
    expect(errStates[0].error?.message).toBe('dest exploded');
  });

  test('push captures consent snapshot when present on event', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID });

    const push = async (
      _event: { id: string; consent: { marketing: boolean } },
      _ctx: { id: string },
    ) => undefined;
    const wrapped = useHooks(push, 'DestinationPush', hooks);
    await wrapped(
      { id: 'evt-c', consent: { marketing: true } },
      { id: 'gtag' },
    );

    const inState = states.find((s) => s.phase === 'in');
    expect(inState!.consent).toEqual({ marketing: true });
  });

  test('batch flush emits a flush state with batch.size', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID });

    const pushBatch = async (
      _batch: { entries: { event: { id: string } }[] },
      _ctx: { id: string },
    ) => undefined;
    const wrapped = useHooks(pushBatch, 'DestinationPushBatch', hooks);
    await wrapped(
      {
        entries: [
          { event: { id: 'a' } },
          { event: { id: 'b' } },
          { event: { id: 'c' } },
        ],
      },
      { id: 'gtag' },
    );

    const flush = states.find((s) => s.phase === 'flush');
    expect(flush).toBeDefined();
    expect(flush!.batch).toEqual({ size: 3, index: 0 });
    expect(flush!.stepId).toBe('destination.gtag');
  });
});

describe('createTelemetryHooks: transformer hooks', () => {
  test('emits in+out for a successful transform', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID });

    const tpush = async (
      event: { id: string; name: string },
      _ctx: { id: string },
    ) => ({ ...event, transformed: true });
    const wrapped = useHooks(tpush, 'TransformerPush', hooks);
    await wrapped({ id: 'evt-t', name: 'page view' }, { id: 'consent' });

    expect(states.length).toBe(2);
    expect(states[0].phase).toBe('in');
    expect(states[0].stepId).toBe('transformer.consent');
    expect(states[0].stepType).toBe('transformer');
    expect(states[1].phase).toBe('out');
  });

  test('emits in+error when transformer throws', async () => {
    const { states, emit } = makeEmit();
    const hooks = createTelemetryHooks(emit, { flowId: FLOW_ID });

    const tpush = async (_event: { id: string }, _ctx: { id: string }) => {
      throw new Error('transform exploded');
    };
    const wrapped = useHooks(tpush, 'TransformerPush', hooks);
    await expect(wrapped({ id: 'evt-te' }, { id: 'consent' })).rejects.toThrow(
      'transform exploded',
    );
    await Promise.resolve();

    const errStates = states.filter((s) => s.phase === 'error');
    expect(errStates.length).toBe(1);
    expect(errStates[0].error?.message).toBe('transform exploded');
  });

  test('captures mappingKey only when includeMappingKey or trace level', async () => {
    const noKey = makeEmit();
    const noKeyHooks = createTelemetryHooks(noKey.emit, {
      flowId: FLOW_ID,
      level: 'standard',
    });

    const tpush = async (
      event: { id: string },
      _ctx: { id: string; mapping: { key: string } },
    ) => event;
    const wrappedNoKey = useHooks(tpush, 'TransformerPush', noKeyHooks);
    await wrappedNoKey(
      { id: 'evt-mk' },
      { id: 'consent', mapping: { key: 'page view' } },
    );

    expect(
      noKey.states.find((s) => s.phase === 'in')!.mappingKey,
    ).toBeUndefined();

    const traced = makeEmit();
    const traceHooks = createTelemetryHooks(traced.emit, {
      flowId: FLOW_ID,
      level: 'trace',
    });
    const wrappedTrace = useHooks(tpush, 'TransformerPush', traceHooks);
    await wrappedTrace(
      { id: 'evt-mk-2' },
      { id: 'consent', mapping: { key: 'page view' } },
    );
    expect(traced.states.find((s) => s.phase === 'in')!.mappingKey).toBe(
      'page view',
    );
  });
});
