import type { FlowState } from '../types/telemetry';
import { createTelemetryObserver, isSampled } from '../telemetry';

const FLOW_ID = 'default';

function makeEmit() {
  const states: FlowState[] = [];
  return { states, emit: (s: FlowState) => states.push(s) };
}

function fullState(overrides: Partial<FlowState>): FlowState {
  return {
    flowId: FLOW_ID,
    stepId: 'collector.push',
    stepType: 'collector',
    phase: 'in',
    eventId: 'evt-1',
    timestamp: new Date(0).toISOString(),
    elapsedMs: 0,
    ...overrides,
  };
}

describe('createTelemetryObserver', () => {
  test('forwards every state to emit at default standard level', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, { flowId: FLOW_ID });

    observer(fullState({ phase: 'in', inEvent: { name: 'page view' } }));
    observer(fullState({ phase: 'out', outEvent: { ok: true } }));

    expect(states.length).toBe(2);
    expect(states[0].phase).toBe('in');
    expect(states[1].phase).toBe('out');
  });

  test('strips inEvent/outEvent at level=standard', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      level: 'standard',
    });

    observer(fullState({ phase: 'in', inEvent: { name: 'page view' } }));
    observer(fullState({ phase: 'out', outEvent: { ok: true } }));

    expect(states[0].inEvent).toBeUndefined();
    expect(states[1].outEvent).toBeUndefined();
  });

  test('keeps inEvent/outEvent at level=trace', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      level: 'trace',
    });

    observer(fullState({ phase: 'in', inEvent: { name: 'page view' } }));
    observer(fullState({ phase: 'out', outEvent: { ok: true } }));

    expect(states[0].inEvent).toEqual({ name: 'page view' });
    expect(states[1].outEvent).toEqual({ ok: true });
  });

  test('includeIn=true forces inEvent through at level=standard', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      level: 'standard',
      includeIn: true,
    });

    observer(fullState({ phase: 'in', inEvent: { name: 'page view' } }));
    expect(states[0].inEvent).toEqual({ name: 'page view' });
  });

  test('drops in and out for the same eventId when sample miss', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      sample: 0,
    });

    observer(fullState({ phase: 'in', eventId: 'evt-x' }));
    observer(fullState({ phase: 'out', eventId: 'evt-x' }));

    expect(states.length).toBe(0);
  });

  test('level=off returns a no-op observer', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      level: 'off',
    });

    observer(fullState({ phase: 'in' }));
    observer(fullState({ phase: 'out' }));

    expect(states.length).toBe(0);
  });

  test('includeMappingKey=false strips mappingKey at standard level', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      level: 'standard',
      includeMappingKey: false,
    });

    observer(
      fullState({
        phase: 'out',
        stepType: 'transformer',
        mappingKey: 'page.view',
      }),
    );

    expect(states[0].mappingKey).toBeUndefined();
  });

  test('flushes phase=skip records through unchanged', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, { flowId: FLOW_ID });

    observer(
      fullState({
        phase: 'skip',
        skipReason: 'consent',
        consent: { marketing: false },
      }),
    );

    expect(states[0].phase).toBe('skip');
    expect(states[0].skipReason).toBe('consent');
    expect(states[0].consent).toEqual({ marketing: false });
  });

  test('isSampled is deterministic per eventId', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `evt-${i}`);
    for (const id of ids) {
      expect(isSampled(id, 0.5)).toBe(isSampled(id, 0.5));
    }
    const passes = ids.filter((id) => isSampled(id, 0.5));
    expect(passes.length).toBeGreaterThan(300);
    expect(passes.length).toBeLessThan(700);
  });

  test('emit throwing does not propagate to the caller', () => {
    const observer = createTelemetryObserver(
      () => {
        throw new Error('emit kaboom');
      },
      { flowId: FLOW_ID },
    );

    expect(() => observer(fullState({ phase: 'in' }))).not.toThrow();
  });

  test('accepts a supplier and re-evaluates opts on every emit', () => {
    const { states, emit } = makeEmit();
    let level: 'standard' | 'trace' = 'standard';
    const observer = createTelemetryObserver(emit, () => ({
      flowId: FLOW_ID,
      level,
    }));

    observer(fullState({ phase: 'in', inEvent: { name: 'page view' } }));
    level = 'trace';
    observer(fullState({ phase: 'in', inEvent: { name: 'page view' } }));

    expect(states.length).toBe(2);
    expect(states[0].inEvent).toBeUndefined();
    expect(states[1].inEvent).toEqual({ name: 'page view' });
  });

  test('supplier returning null skips the emit', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, () => null);

    observer(fullState({ phase: 'in', inEvent: { name: 'page view' } }));
    observer(fullState({ phase: 'out' }));

    expect(states.length).toBe(0);
  });

  test('NaN sample defaults to 1 (emit all)', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      sample: Number.NaN,
    });

    observer(fullState({ phase: 'in', eventId: 'evt-a' }));
    observer(fullState({ phase: 'in', eventId: 'evt-b' }));
    observer(fullState({ phase: 'in', eventId: 'evt-c' }));

    expect(states.length).toBe(3);
  });

  test('error.message truncates to 256 chars outside trace; full at trace', () => {
    const longMessage = 'x'.repeat(500);

    const standard = makeEmit();
    const standardObserver = createTelemetryObserver(standard.emit, {
      flowId: FLOW_ID,
      level: 'standard',
    });
    standardObserver(
      fullState({
        phase: 'error',
        error: { name: 'BoomError', message: longMessage },
      }),
    );
    expect(standard.states[0].error?.message.length).toBe(257);
    expect(standard.states[0].error?.message.endsWith('…')).toBe(true);
    expect(standard.states[0].error?.name).toBe('BoomError');

    const trace = makeEmit();
    const traceObserver = createTelemetryObserver(trace.emit, {
      flowId: FLOW_ID,
      level: 'trace',
    });
    traceObserver(
      fullState({
        phase: 'error',
        error: { name: 'BoomError', message: longMessage },
      }),
    );
    expect(trace.states[0].error?.message).toBe(longMessage);
  });
});
