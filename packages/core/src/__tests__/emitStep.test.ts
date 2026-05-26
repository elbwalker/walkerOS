import type { Collector, FlowState, ObserverFn } from '..';
import { createLogger } from '../logger';
import { emitStep } from '../emitStep';

function makeCollector(observers: Set<ObserverFn>): Collector.Instance {
  const logger = createLogger({});
  const collector: Collector.Instance = {
    allowed: true,
    config: { globalsStatic: {}, sessionStatic: {}, queueMax: 1000 },
    consent: {},
    custom: {},
    destinations: {},
    transformers: {},
    stores: {},
    globals: {},
    hooks: {},
    observers,
    logger,
    on: {},
    queue: [],
    round: 0,
    session: undefined,
    status: {
      startedAt: 0,
      in: 0,
      out: 0,
      failed: 0,
      sources: {},
      destinations: {},
      dropped: {},
    },
    timing: 0,
    user: {},
    sources: {},
    pending: { destinations: {} },
    push: async () => ({ ok: true }),
    command: async () => ({ ok: true }),
  };
  return collector;
}

function state(phase: FlowState['phase']): FlowState {
  return {
    flowId: 'default',
    stepId: 'collector.push',
    stepType: 'collector',
    phase,
    eventId: 'evt-1',
    timestamp: new Date(0).toISOString(),
    elapsedMs: 0,
  };
}

describe('emitStep', () => {
  test('fans out to every registered observer in insertion order', () => {
    const seen: string[] = [];
    const a: ObserverFn = (s) => seen.push('a:' + s.phase);
    const b: ObserverFn = (s) => seen.push('b:' + s.phase);
    const observers = new Set<ObserverFn>([a, b]);

    emitStep(makeCollector(observers), state('in'));

    expect(seen).toEqual(['a:in', 'b:in']);
  });

  test('a throwing observer does not prevent the next one from receiving the state', () => {
    const seen: string[] = [];
    const bad: ObserverFn = () => {
      throw new Error('observer kaboom');
    };
    const good: ObserverFn = (s) => seen.push(s.phase);
    const observers = new Set<ObserverFn>([bad, good]);

    emitStep(makeCollector(observers), state('out'));

    expect(seen).toEqual(['out']);
  });

  test('no observers means no-op (does not throw)', () => {
    const observers = new Set<ObserverFn>();
    expect(() => emitStep(makeCollector(observers), state('in'))).not.toThrow();
  });
});
