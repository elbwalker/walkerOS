import type { Collector, FlowState, ObserverFn } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { buildBaseState, emit } from '../observerEmit';

function makeCollector(observers: Set<ObserverFn>): Collector.Instance {
  return {
    allowed: true,
    config: {
      globalsStatic: {},
      sessionStatic: {},
      queueMax: 1000,
    },
    consent: {},
    custom: {},
    sources: {},
    destinations: {},
    transformers: {},
    stores: {},
    globals: {},
    hooks: {},
    observers,
    logger: createMockLogger(),
    on: {},
    queue: [],
    round: 0,
    stateVersion: 0,
    cellVersion: {},
    delivery: new WeakMap(),
    seenEvents: new Set(),
    session: undefined,
    status: {
      startedAt: 1000,
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations: {},
      dropped: {},
    },
    timing: 1000,
    user: {},
    pending: { destinations: {} },
    push: async () => ({ ok: true }),
    command: async () => ({ ok: true }),
  };
}

describe('observerEmit helpers', () => {
  test('buildBaseState carries flowId, stepId, stepType, phase, eventId, timestamp, elapsedMs', () => {
    const seen: FlowState[] = [];
    const collector = makeCollector(new Set([(s) => seen.push(s)]));
    const state = buildBaseState(collector, {
      stepId: 'collector.push',
      stepType: 'collector',
      phase: 'in',
      eventId: 'evt-1',
      now: 1500,
    });

    expect(state.flowId).toBeDefined();
    expect(state.stepId).toBe('collector.push');
    expect(state.stepType).toBe('collector');
    expect(state.phase).toBe('in');
    expect(state.eventId).toBe('evt-1');
    expect(state.elapsedMs).toBe(500);
    expect(state.timestamp).toBe(new Date(1500).toISOString());
  });

  test('emit fans out via emitStep and does not throw on observer failure', () => {
    const seen: FlowState[] = [];
    const collector = makeCollector(
      new Set<ObserverFn>([
        () => {
          throw new Error('bad observer');
        },
        (s) => seen.push(s),
      ]),
    );

    expect(() =>
      emit(collector, {
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        eventId: 'evt-2',
        now: 2000,
      }),
    ).not.toThrow();

    expect(seen.length).toBe(1);
    expect(seen[0].eventId).toBe('evt-2');
  });
});
