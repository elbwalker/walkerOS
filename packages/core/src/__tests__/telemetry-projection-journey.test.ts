import type { FlowState } from '../types/telemetry';
import { createTelemetryObserver } from '../telemetry';

const FLOW_ID = 'default';

function makeEmit() {
  const states: FlowState[] = [];
  return { states, emit: (s: FlowState) => states.push(s) };
}

function fullState(overrides: Partial<FlowState>): FlowState {
  return {
    flowId: FLOW_ID,
    stepId: 'destination.gtag',
    stepType: 'destination',
    phase: 'out',
    eventId: 'evt-1',
    timestamp: new Date(0).toISOString(),
    elapsedMs: 0,
    ...overrides,
  };
}

const correlation: Pick<
  FlowState,
  'traceId' | 'parentEventId' | 'sourceId' | 'seq'
> = {
  traceId: 'a'.repeat(32),
  parentEventId: 'b'.repeat(16),
  sourceId: 'source.browser',
  seq: 7,
};

const sampleCalls: FlowState['calls'] = [
  { fn: 'window.gtag', args: ['event', 'page_view'], ts: 0 },
];

describe('createTelemetryObserver journey projection', () => {
  test('standard level keeps correlation fields and strips calls', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      level: 'standard',
    });

    observer(fullState({ ...correlation, calls: sampleCalls }));

    expect(states.length).toBe(1);
    expect(states[0].traceId).toBe(correlation.traceId);
    expect(states[0].parentEventId).toBe(correlation.parentEventId);
    expect(states[0].sourceId).toBe(correlation.sourceId);
    expect(states[0].seq).toBe(correlation.seq);
    expect(states[0].calls).toBeUndefined();
  });

  test('trace level keeps calls', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      level: 'trace',
    });

    observer(fullState({ ...correlation, calls: sampleCalls }));

    expect(states[0].calls).toEqual(sampleCalls);
    // Correlation fields survive trace too.
    expect(states[0].traceId).toBe(correlation.traceId);
    expect(states[0].seq).toBe(correlation.seq);
  });

  test('standard level with includeOut=true keeps calls', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      level: 'standard',
      includeOut: true,
    });

    observer(fullState({ ...correlation, calls: sampleCalls }));

    expect(states[0].calls).toEqual(sampleCalls);
    expect(states[0].sourceId).toBe(correlation.sourceId);
  });

  test('off level emits nothing', () => {
    const { states, emit } = makeEmit();
    const observer = createTelemetryObserver(emit, {
      flowId: FLOW_ID,
      level: 'off',
    });

    observer(fullState({ ...correlation, calls: sampleCalls }));

    expect(states.length).toBe(0);
  });
});
