import type {
  FlowState,
  AssembleJourneysOptions,
  JourneyTopology,
} from '../types';
import { assembleJourneys } from '../journey';

/**
 * Event-grain assembly: one journey per event, not per run. A run trace groups
 * many independent events, so grouping on it folded every event of a page load
 * into a single row whose hops last-wins-merged across events. These cases pin
 * the projection at the event grain and pin the one linkage that still merges
 * (a $flow crossing continuation) against the one that must not (a fan-out).
 */

const BASE = Date.parse('2026-07-27T10:00:00.000Z');

/** Fixed `now` well past every fixture's last record, so completeness is settled. */
const SETTLED: AssembleJourneysOptions = { now: BASE + 100000 };

/** ISO timestamp `ms` after the fixed base wall-clock. */
function iso(ms: number): string {
  return new Date(BASE + ms).toISOString();
}

/** Typed FlowState builder; only the varying fields need to be passed. */
function rec(overrides: Partial<FlowState>): FlowState {
  return {
    flowId: 'flow1',
    platform: 'web',
    stepId: 'collector.push',
    stepType: 'collector',
    phase: 'in',
    eventId: 'e-1',
    traceId: 'run-1',
    timestamp: iso(overrides.elapsedMs ?? 0),
    elapsedMs: 0,
    ...overrides,
  };
}

/** Trace-less builder: the literal never carries a traceId key at all. */
function recNoTrace(overrides: Partial<FlowState>): FlowState {
  return {
    flowId: 'flow1',
    platform: 'web',
    stepId: 'collector.push',
    stepType: 'collector',
    phase: 'in',
    eventId: '',
    timestamp: iso(overrides.elapsedMs ?? 0),
    elapsedMs: 0,
    ...overrides,
  };
}

/** One event's records on one runtime: collector in/out plus a delivering destination. */
function eventRecords(over: {
  eventId: string;
  name: string;
  atMs: number;
  platform?: 'web' | 'server';
  traceId?: string;
  parentEventId?: string;
}): FlowState[] {
  const shared: Partial<FlowState> = {
    eventId: over.eventId,
    platform: over.platform ?? 'web',
    ...(over.traceId !== undefined ? { traceId: over.traceId } : {}),
    ...(over.parentEventId !== undefined
      ? { parentEventId: over.parentEventId }
      : {}),
  };
  return [
    rec({
      ...shared,
      stepId: 'collector.push',
      stepType: 'collector',
      phase: 'in',
      inEvent: { name: over.name },
      sourceId: 'source.browser',
      elapsedMs: over.atMs,
      timestamp: iso(over.atMs),
    }),
    rec({
      ...shared,
      stepId: 'collector.push',
      stepType: 'collector',
      phase: 'out',
      elapsedMs: over.atMs + 1,
      timestamp: iso(over.atMs + 1),
    }),
    rec({
      ...shared,
      stepId: 'destination.gtag',
      stepType: 'destination',
      phase: 'out',
      elapsedMs: over.atMs + 3,
      timestamp: iso(over.atMs + 3),
    }),
  ];
}

describe('assembleJourneys - one journey per event', () => {
  test('one run with three events yields three journeys, each with its own name', () => {
    const records = [
      ...eventRecords({ eventId: 'e-1', name: 'session start', atMs: 0 }),
      ...eventRecords({ eventId: 'e-2', name: 'page view', atMs: 100 }),
      ...eventRecords({ eventId: 'e-3', name: 'product click', atMs: 200 }),
    ];

    const { journeys } = assembleJourneys(records, SETTLED);

    expect(journeys.map((j) => j.id)).toEqual(['e-1', 'e-2', 'e-3']);
    expect(journeys.map((j) => j.entry.name)).toEqual([
      'session start',
      'page view',
      'product click',
    ]);
    // The run trace is retained on every journey as the run handle.
    expect(journeys.map((j) => j.traceId)).toEqual(['run-1', 'run-1', 'run-1']);
    expect(journeys.map((j) => j.correlation)).toEqual([
      'event',
      'event',
      'event',
    ]);
    // Each journey holds only its own event's hops; no last-wins folding.
    for (const journey of journeys) {
      expect(journey.hops.map((h) => h.stepId)).toEqual([
        'collector.push',
        'destination.gtag',
      ]);
      expect(journey.hops.every((h) => h.eventId === journey.id)).toBe(true);
    }
  });

  test('the group key is the event id alone: differing run traces still form one journey', () => {
    // A crossing: the web arm's run trace and the server arm's run trace are
    // different by construction (two runtimes, two runs). Grouping on
    // (traceId, eventId) would split them; the parentEventId link joins them.
    const web = eventRecords({
      eventId: 'e-web',
      name: 'order complete',
      atMs: 0,
      traceId: 'run-web',
    });
    const server = eventRecords({
      eventId: 'e-srv',
      name: 'order complete',
      atMs: 40,
      platform: 'server',
      traceId: 'run-server',
      parentEventId: 'e-web',
    });

    const { journeys } = assembleJourneys([...web, ...server], SETTLED);

    expect(journeys).toHaveLength(1);
    expect(journeys[0].id).toBe('e-web');
    expect(journeys[0].platforms).toEqual(['web', 'server']);
    // The run handle is the ROOT arm's trace, so the journey groups under the
    // run the event originated in.
    expect(journeys[0].traceId).toBe('run-web');
  });

  test('siblings sharing one parent are NOT merged: a fan-out stays N journeys', () => {
    // One inbound request (one ingest scope, one traceparent) decoded into two
    // server events. Both carry the same parentEventId. Merging them would put
    // two events' `server\0collector.push` records under one hop and last-wins
    // their payloads: exactly the folding the event grain removes.
    const web = eventRecords({
      eventId: 'e-web',
      name: 'order complete',
      atMs: 0,
      traceId: 'run-web',
    });
    const first = eventRecords({
      eventId: 'e-s1',
      name: 'purchase',
      atMs: 40,
      platform: 'server',
      traceId: 'run-server',
      parentEventId: 'e-web',
    });
    const second = eventRecords({
      eventId: 'e-s2',
      name: 'add payment info',
      atMs: 40,
      platform: 'server',
      traceId: 'run-server',
      parentEventId: 'e-web',
    });

    const { journeys } = assembleJourneys(
      [...web, ...first, ...second],
      SETTLED,
    );

    expect(journeys.map((j) => j.id).sort()).toEqual(['e-s1', 'e-s2', 'e-web']);
    // The linkage is not lost: each sibling's hops still name the parent.
    const sibling = journeys.find((j) => j.id === 'e-s1');
    expect(sibling?.platforms).toEqual(['server']);
    expect(sibling?.hops.every((h) => h.parentEventId === 'e-web')).toBe(true);
    // Each sibling keeps its own name rather than the last one written.
    expect(journeys.find((j) => j.id === 'e-s2')?.entry.name).toBe(
      'add payment info',
    );
  });

  test('replaying an event-grain stream is idempotent', () => {
    const records = [
      ...eventRecords({ eventId: 'e-1', name: 'session start', atMs: 0 }),
      ...eventRecords({ eventId: 'e-2', name: 'page view', atMs: 100 }),
    ].map((r, i) => ({ ...r, seq: i + 1 }));

    expect(assembleJourneys([...records, ...records], SETTLED)).toEqual(
      assembleJourneys(records, SETTLED),
    );
  });
});

describe('assembleJourneys - old-emitter anonymous records', () => {
  /** A deployed bundle predating the early id mint: both collector.push records are anonymous. */
  function oldEmitter(withOutEvent: boolean): FlowState[] {
    return [
      recNoTrace({
        traceId: 'run-1',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        inEvent: { name: 'page view' },
        elapsedMs: 0,
        timestamp: iso(0),
      }),
      recNoTrace({
        traceId: 'run-1',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
        timestamp: iso(2),
        ...(withOutEvent
          ? { outEvent: { ok: true, event: { id: 'e-1', name: 'page view' } } }
          : {}),
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 5,
        timestamp: iso(5),
      }),
    ];
  }

  const topology: JourneyTopology = {
    nodes: [
      { stepId: 'collector.push', downstream: ['destination.gtag'] },
      { stepId: 'destination.gtag', downstream: [] },
    ],
  };

  test('trace level: an anonymous out record adopts its push result id and completes the hop', () => {
    const { journeys, unattributed } = assembleJourneys(oldEmitter(true), {
      ...SETTLED,
      topology,
    });

    expect(journeys).toHaveLength(1);
    const journey = journeys[0];
    expect(journey.id).toBe('e-1');
    expect(journey.hops.map((h) => h.stepId)).toEqual([
      'collector.push',
      'destination.gtag',
    ]);
    const push = journey.hops[0];
    expect(push.terminalPhase).toBe('out');
    expect(push.eventId).toBe('e-1');
    expect(journey.status).toBe('complete');

    // The in record carries no push result, so it is still unattributable and
    // is reported rather than silently dropped.
    expect(unattributed).toEqual([
      {
        platform: 'web',
        count: 1,
        fromMs: BASE + 0,
        toMs: BASE + 0,
        stepIds: ['collector.push'],
      },
    ]);
  });

  test('standard level: the hop is missing, the journey reads partial, loss is reported', () => {
    const { journeys, unattributed } = assembleJourneys(oldEmitter(false), {
      ...SETTLED,
      topology,
    });

    expect(journeys).toHaveLength(1);
    expect(journeys[0].id).toBe('e-1');
    // collector.push is a topology node; with no attributable record the
    // frontier walk reports the truth rather than inventing the hop.
    expect(journeys[0].hops.map((h) => h.stepId)).toEqual(['destination.gtag']);
    expect(journeys[0].status).toBe('partial');

    // stepIds is the actionable part: it names the runtime step to redeploy.
    expect(unattributed).toEqual([
      {
        platform: 'web',
        count: 2,
        fromMs: BASE + 0,
        toMs: BASE + 2,
        stepIds: ['collector.push'],
      },
    ]);
  });

  test('adoption fills an absent id, it never overrides a present one', () => {
    // A fan-out wrap: the record belongs to the wrap's own event, while the
    // push result reports the first child. Overriding would move the record
    // into another event's journey and split the wrap's in/out pair.
    const records: FlowState[] = [
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        eventId: 'e-parent',
        inEvent: { name: 'page view' },
        elapsedMs: 0,
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        eventId: 'e-parent',
        elapsedMs: 2,
        outEvent: { ok: true, event: { id: 'e-child' } },
      }),
    ];

    const { journeys } = assembleJourneys(records, SETTLED);

    expect(journeys).toHaveLength(1);
    expect(journeys[0].id).toBe('e-parent');
    expect(journeys[0].hops[0].terminalPhase).toBe('out');
  });

  test('a mid-chain anonymous transformer record is reported, not guessed at', () => {
    // Multi-step rebuilding chains can leave an interior transformer record
    // anonymous. Its outEvent is a bare event, not a push result, so there is
    // no bounded field to adopt: it is reported rather than attached by
    // adjacency.
    const records: FlowState[] = [
      ...eventRecords({ eventId: 'e-1', name: 'page view', atMs: 0 }),
      recNoTrace({
        traceId: 'run-1',
        stepId: 'transformer.enrich',
        stepType: 'transformer',
        phase: 'out',
        elapsedMs: 8,
        timestamp: iso(8),
        outEvent: { id: 'e-1', name: 'page view' },
      }),
    ];

    const { journeys, unattributed } = assembleJourneys(records, SETTLED);

    expect(journeys).toHaveLength(1);
    expect(journeys[0].hops.map((h) => h.stepId)).toEqual([
      'collector.push',
      'destination.gtag',
    ]);
    expect(unattributed).toEqual([
      {
        platform: 'web',
        count: 1,
        fromMs: BASE + 8,
        toMs: BASE + 8,
        stepIds: ['transformer.enrich'],
      },
    ]);
  });

  test('records with no traceId belong to no event run and never count', () => {
    const records: FlowState[] = [
      ...eventRecords({ eventId: 'e-1', name: 'page view', atMs: 0 }),
      // Destination init and a store read: emitted with no eventId AND no
      // traceId, so they are excluded by design.
      recNoTrace({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'init',
        elapsedMs: 0,
      }),
      recNoTrace({
        stepId: 'store.session',
        stepType: 'store',
        phase: 'out',
        elapsedMs: 1,
      }),
    ];

    const { journeys, unattributed } = assembleJourneys(records, SETTLED);

    expect(journeys).toHaveLength(1);
    expect(unattributed).toBeUndefined();
  });
});

describe('assembleJourneys - event-grain entry and batch attribution', () => {
  test('entry comes from the root arm even when the far arm clock reads earlier', () => {
    const web = eventRecords({
      eventId: 'e-web',
      name: 'order complete',
      atMs: 1000,
      traceId: 'run-web',
    });
    // The server container's clock is behind the browser's, so its records
    // carry earlier wall-clock timestamps than the web arm that produced them.
    const server = eventRecords({
      eventId: 'e-srv',
      name: 'order complete',
      atMs: 0,
      platform: 'server',
      traceId: 'run-server',
      parentEventId: 'e-web',
    });

    const { journeys } = assembleJourneys([...web, ...server], SETTLED);

    expect(journeys).toHaveLength(1);
    expect(journeys[0].entry.eventId).toBe('e-web');
    expect(journeys[0].entry.platform).toBe('web');
  });

  test('a per-entry flush frame confirms only its own event', () => {
    const batched = (eventId: string, atMs: number): FlowState[] => [
      rec({
        eventId,
        stepId: 'destination.api',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: atMs,
        timestamp: iso(atMs),
        batch: { size: 2, index: 0 },
      }),
    ];
    const records: FlowState[] = [
      ...batched('e-1', 1),
      ...batched('e-2', 2),
      // The flush fans out per entry, so the frame names the event it covers.
      rec({
        eventId: 'e-1',
        stepId: 'destination.api',
        stepType: 'destination',
        phase: 'flush',
        elapsedMs: 10,
        timestamp: iso(10),
        batch: { size: 2, index: 0 },
      }),
    ];

    const { journeys } = assembleJourneys(records, SETTLED);

    const flushed = journeys.find((j) => j.id === 'e-1');
    const unflushed = journeys.find((j) => j.id === 'e-2');
    expect(flushed?.hops[0].batched).toBe(true);
    expect(flushed?.hops[0].flushConfirmed).toBe(true);
    expect(unflushed?.hops[0].batched).toBe(true);
    expect(unflushed?.hops[0].flushConfirmed).toBeUndefined();
  });

  test('several flush frames on one hop stay one confirmation', () => {
    const flush = (atMs: number): FlowState =>
      rec({
        stepId: 'destination.api',
        stepType: 'destination',
        phase: 'flush',
        elapsedMs: atMs,
        timestamp: iso(atMs),
        batch: { size: 1, index: 0 },
      });
    const records: FlowState[] = [
      rec({
        stepId: 'destination.api',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 1,
        timestamp: iso(1),
        batch: { size: 1, index: 0 },
      }),
      flush(10),
      flush(20),
    ];

    const hop = assembleJourneys(records, SETTLED).journeys[0].hops[0];
    expect(hop.flushConfirmed).toBe(true);
    expect(hop.eventId).toBe('e-1');
    expect(hop.terminalPhase).toBe('out');
  });
});
