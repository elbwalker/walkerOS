import type {
  FlowState,
  AssembleJourneysOptions,
  JourneyTopology,
} from '../types';
import { assembleJourneys } from '../journey';

const BASE = Date.parse('2026-07-06T10:00:00.000Z');

/** Fixed `now` well past every fixture's last record, so completeness is settled and deterministic. */
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
    eventId: 'E1',
    traceId: 'T1',
    timestamp: iso(overrides.elapsedMs ?? 0),
    elapsedMs: 0,
    ...overrides,
  };
}

/** A complete web-only linear journey: collector -> transformer -> destination. */
function webLinear(): FlowState[] {
  return [
    rec({
      stepId: 'collector.push',
      stepType: 'collector',
      phase: 'in',
      elapsedMs: 0,
      inEvent: { name: 'page view' },
      sourceId: 'source.browser',
    }),
    rec({
      stepId: 'collector.push',
      stepType: 'collector',
      phase: 'out',
      elapsedMs: 5,
    }),
    rec({
      stepId: 'transformer.consent',
      stepType: 'transformer',
      phase: 'in',
      elapsedMs: 6,
    }),
    rec({
      stepId: 'transformer.consent',
      stepType: 'transformer',
      phase: 'out',
      elapsedMs: 8,
      consent: { marketing: true },
    }),
    rec({
      stepId: 'destination.gtag',
      stepType: 'destination',
      phase: 'in',
      elapsedMs: 9,
    }),
    rec({
      stepId: 'destination.gtag',
      stepType: 'destination',
      phase: 'out',
      elapsedMs: 12,
      durationMs: 3,
      mappingKey: 'page view',
    }),
  ];
}

describe('assembleJourneys — grouping and hops', () => {
  test('(a) web-only linear journey: one journey, ordered hops, entry extracted', () => {
    const { journeys, gaps } = assembleJourneys(webLinear(), SETTLED);

    expect(gaps).toEqual([]);
    expect(journeys).toHaveLength(1);

    const journey = journeys[0];
    expect(journey.id).toBe('T1');
    expect(journey.correlation).toBe('trace');
    expect(journey.traceId).toBe('T1');
    // Settled, no topology, every hop terminal (all 'out') -> complete.
    expect(journey.status).toBe('complete');
    expect(journey.lossy).toBe(false);
    expect(journey.platforms).toEqual(['web']);

    expect(journey.entry).toEqual({
      eventId: 'E1',
      name: 'page view',
      timestamp: iso(0),
      sourceId: 'source.browser',
      platform: 'web',
    });

    expect(journey.hops.map((h) => h.stepId)).toEqual([
      'collector.push',
      'transformer.consent',
      'destination.gtag',
    ]);
    expect(journey.hops.map((h) => h.status)).toEqual(['done', 'done', 'done']);
    expect(journey.hops.map((h) => h.terminalPhase)).toEqual([
      'out',
      'out',
      'out',
    ]);

    const gtag = journey.hops[2];
    expect(gtag.durationMs).toBe(3);
    expect(gtag.mappingKey).toBe('page view');
    expect(gtag.startedAtMs).toBe(9);

    expect(journey.firstTimestamp).toBe(BASE + 0);
    expect(journey.lastTimestamp).toBe(BASE + 12);
    expect(journey.totalMs).toBe(12);
  });

  test('(b) web->server crossing: one journey, web segment before server segment', () => {
    const web = webLinear();
    const server: FlowState[] = [
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        eventId: 'E2',
        parentEventId: 'E1',
        elapsedMs: 0,
        timestamp: iso(40),
      }),
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        eventId: 'E2',
        parentEventId: 'E1',
        elapsedMs: 3,
        timestamp: iso(43),
      }),
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'in',
        eventId: 'E2',
        parentEventId: 'E1',
        elapsedMs: 4,
        timestamp: iso(44),
      }),
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'out',
        eventId: 'E2',
        parentEventId: 'E1',
        elapsedMs: 9,
        timestamp: iso(49),
      }),
    ];

    const { journeys } = assembleJourneys([...web, ...server]);
    expect(journeys).toHaveLength(1);

    const journey = journeys[0];
    expect(journey.platforms).toEqual(['web', 'server']);
    expect(journey.hops.map((h) => `${h.platform}:${h.stepId}`)).toEqual([
      'web:collector.push',
      'web:transformer.consent',
      'web:destination.gtag',
      'server:collector.push',
      'server:destination.bigquery',
    ]);

    // Entry is the earliest collector-in across runtimes: the web root event.
    expect(journey.entry.eventId).toBe('E1');
    expect(journey.entry.platform).toBe('web');

    const serverHops = journey.hops.filter((h) => h.platform === 'server');
    expect(serverHops.map((h) => h.eventId)).toEqual(['E2', 'E2']);
    expect(serverHops.map((h) => h.parentEventId)).toEqual(['E1', 'E1']);
  });

  test('(c) duplicated records (SSE replay) collapse to the same output as without dupes', () => {
    const withSeq: FlowState[] = webLinear().map((r, i) => ({
      ...r,
      seq: i,
    }));
    const duplicated = [...withSeq, ...withSeq];

    expect(assembleJourneys(duplicated, SETTLED)).toEqual(
      assembleJourneys(withSeq, SETTLED),
    );
  });

  test('(c2) tuple dedupe collapses replayed records that carry no seq', () => {
    const base = webLinear();
    const duplicated = [...base, ...base];

    expect(assembleJourneys(duplicated, SETTLED)).toEqual(
      assembleJourneys(base, SETTLED),
    );
  });

  test('(c3) seqless records differing only by platform are not deduped', () => {
    // Same stepId/phase/eventId/branchId/elapsedMs, NO seq, but different
    // platform: the fallback tuple must keep platforms distinct so a web and a
    // server hop both survive rather than one being dropped as a duplicate.
    const web = rec({
      platform: 'web',
      stepId: 'destination.gtag',
      stepType: 'destination',
      phase: 'out',
      eventId: 'E1',
      elapsedMs: 5,
    });
    const server = rec({
      platform: 'server',
      stepId: 'destination.gtag',
      stepType: 'destination',
      phase: 'out',
      eventId: 'E1',
      elapsedMs: 5,
    });

    const { journeys } = assembleJourneys([web, server], SETTLED);
    expect(journeys).toHaveLength(1);

    const { hops, platforms } = journeys[0];
    expect(hops).toHaveLength(2);
    expect([...platforms].sort()).toEqual(['server', 'web']);
    expect(hops.map((h) => h.platform).sort()).toEqual(['server', 'web']);
  });

  test("(d) legacy records without traceId: correlation 'legacy', id 'event:<id>'", () => {
    const legacy: FlowState[] = [
      rec({
        traceId: undefined,
        eventId: 'L1',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        inEvent: { name: 'order complete' },
      }),
      rec({
        traceId: undefined,
        eventId: 'L1',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
      }),
      rec({
        traceId: undefined,
        eventId: 'L1',
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 5,
      }),
    ];

    const { journeys } = assembleJourneys(legacy);
    expect(journeys).toHaveLength(1);

    const journey = journeys[0];
    expect(journey.correlation).toBe('legacy');
    expect(journey.id).toBe('event:L1');
    expect(journey.traceId).toBeUndefined();
    expect(journey.entry.eventId).toBe('L1');
    expect(journey.entry.name).toBe('order complete');
  });

  test('(e) out-of-order arrival yields the same output as sorted input', () => {
    const sorted = webLinear();
    const shuffled = [
      sorted[4],
      sorted[0],
      sorted[5],
      sorted[2],
      sorted[1],
      sorted[3],
    ];

    expect(assembleJourneys(shuffled, SETTLED)).toEqual(
      assembleJourneys(sorted, SETTLED),
    );
  });

  test('(f) topology reorders two same-elapsedMs hops by rank', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 1,
      }),
      rec({
        stepId: 'destination.alpha',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 10,
      }),
      rec({
        stepId: 'destination.alpha',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 12,
      }),
      rec({
        stepId: 'destination.zeta',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 10,
      }),
      rec({
        stepId: 'destination.zeta',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 12,
      }),
    ];

    // Without topology, the same-elapsedMs tie breaks by stepId (alpha < zeta).
    const withoutTopo = assembleJourneys(records);
    expect(withoutTopo.journeys[0].hops.map((h) => h.stepId)).toEqual([
      'collector.push',
      'destination.alpha',
      'destination.zeta',
    ]);

    // Topology ranks zeta before alpha, overriding the elapsedMs tie.
    const topology: JourneyTopology = {
      nodes: [
        {
          stepId: 'collector.push',
          downstream: ['destination.zeta', 'destination.alpha'],
        },
        { stepId: 'destination.zeta', downstream: [] },
        { stepId: 'destination.alpha', downstream: [] },
      ],
    };
    const options: AssembleJourneysOptions = { topology };
    const withTopo = assembleJourneys(records, options);
    expect(withTopo.journeys[0].hops.map((h) => h.stepId)).toEqual([
      'collector.push',
      'destination.zeta',
      'destination.alpha',
    ]);
  });

  test('(g) two independent traceIds: two journeys, oldest first by firstTimestamp', () => {
    const older: FlowState[] = [
      rec({
        traceId: 'T_old',
        eventId: 'A1',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        timestamp: iso(0),
      }),
      rec({
        traceId: 'T_old',
        eventId: 'A1',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
        timestamp: iso(2),
      }),
    ];
    const newer: FlowState[] = [
      rec({
        traceId: 'T_new',
        eventId: 'B1',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        timestamp: iso(1000),
      }),
      rec({
        traceId: 'T_new',
        eventId: 'B1',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
        timestamp: iso(1002),
      }),
    ];

    // Feed newest-first to prove the output is sorted, not input-ordered.
    const { journeys } = assembleJourneys([...newer, ...older]);
    expect(journeys.map((j) => j.id)).toEqual(['T_old', 'T_new']);
    expect(journeys[0].firstTimestamp).toBeLessThan(journeys[1].firstTimestamp);
  });

  test('batched terminal out marks the hop batched', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 1,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 3,
        batch: { size: 4, index: 2 },
      }),
    ];

    const { journeys } = assembleJourneys(records);
    const hop = journeys[0].hops[0];
    expect(hop.batched).toBe(true);
    expect(hop.status).toBe('done');
  });

  test('skip and error terminal phases collapse to hop status', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'destination.consented',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 1,
      }),
      rec({
        stepId: 'destination.consented',
        stepType: 'destination',
        phase: 'skip',
        elapsedMs: 2,
        skipReason: 'consent',
      }),
      rec({
        stepId: 'destination.failing',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 3,
      }),
      rec({
        stepId: 'destination.failing',
        stepType: 'destination',
        phase: 'error',
        elapsedMs: 4,
        error: { name: 'HttpError', message: 'boom' },
      }),
    ];

    const { journeys } = assembleJourneys(records);
    const byId = new Map(journeys[0].hops.map((h) => [h.stepId, h]));

    const skipped = byId.get('destination.consented');
    expect(skipped?.status).toBe('skipped');
    expect(skipped?.skipReason).toBe('consent');

    const errored = byId.get('destination.failing');
    expect(errored?.status).toBe('error');
    expect(errored?.error).toEqual({ name: 'HttpError', message: 'boom' });
  });
});

describe('assembleJourneys — completeness (status + settle)', () => {
  test('settle transition: same input pends before settleMs, completes after', () => {
    const records = webLinear();
    const last = BASE + 12; // lastTimestamp of webLinear (max elapsedMs 12)

    const pending = assembleJourneys(records, { now: last + 14999 });
    expect(pending.journeys[0].status).toBe('pending');

    const settled = assembleJourneys(records, { now: last + 15000 });
    expect(settled.journeys[0].status).toBe('complete');
  });

  test('no topology: a non-terminal hop after settle makes the journey partial', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
      }),
      // destination stalled at 'in' (never reached a terminal phase).
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 4,
      }),
    ];

    const { journeys } = assembleJourneys(records, SETTLED);
    expect(journeys[0].status).toBe('partial');
  });
});

describe('assembleJourneys — topology frontier walk', () => {
  const collectorInOut = (): FlowState[] => [
    rec({
      stepId: 'collector.push',
      stepType: 'collector',
      phase: 'in',
      elapsedMs: 0,
    }),
    rec({
      stepId: 'collector.push',
      stepType: 'collector',
      phase: 'out',
      elapsedMs: 2,
    }),
  ];

  /**
   * Full web -> server crossing topology. Both platforms declare
   * collector.push; the crossing edge targets the server source (unique
   * stepId across the crossing).
   */
  const crossingTopology = (): JourneyTopology => ({
    nodes: [
      {
        stepId: 'collector.push',
        platform: 'web',
        downstream: ['destination.gtag'],
      },
      {
        stepId: 'destination.gtag',
        platform: 'web',
        downstream: ['source.ingest'],
      },
      {
        stepId: 'source.ingest',
        platform: 'server',
        downstream: ['collector.push'],
      },
      {
        stepId: 'collector.push',
        platform: 'server',
        downstream: ['destination.bigquery'],
      },
      { stepId: 'destination.bigquery', platform: 'server', downstream: [] },
    ],
  });

  test('a done collector expects its downstream destination; missing -> partial', () => {
    const topology: JourneyTopology = {
      nodes: [
        { stepId: 'collector.push', downstream: ['destination.gtag'] },
        { stepId: 'destination.gtag', downstream: [] },
      ],
    };

    const { journeys } = assembleJourneys(collectorInOut(), {
      ...SETTLED,
      topology,
    });
    expect(journeys[0].status).toBe('partial');
  });

  test('a consent-skipped destination is terminal -> complete', () => {
    const records: FlowState[] = [
      ...collectorInOut(),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 3,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'skip',
        elapsedMs: 4,
        skipReason: 'consent',
      }),
    ];
    const topology: JourneyTopology = {
      nodes: [
        { stepId: 'collector.push', downstream: ['destination.gtag'] },
        { stepId: 'destination.gtag', downstream: [] },
      ],
    };

    const { journeys } = assembleJourneys(records, { ...SETTLED, topology });
    expect(journeys[0].status).toBe('complete');
  });

  test('a passing transformer (non-null out) expects downstream; observed -> complete', () => {
    const records: FlowState[] = [
      ...collectorInOut(),
      rec({
        stepId: 'transformer.enrich',
        stepType: 'transformer',
        phase: 'in',
        elapsedMs: 3,
      }),
      rec({
        stepId: 'transformer.enrich',
        stepType: 'transformer',
        phase: 'out',
        elapsedMs: 4,
        outEvent: { name: 'page view' },
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 5,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 6,
      }),
    ];
    const topology: JourneyTopology = {
      nodes: [
        { stepId: 'collector.push', downstream: ['transformer.enrich'] },
        { stepId: 'transformer.enrich', downstream: ['destination.gtag'] },
        { stepId: 'destination.gtag', downstream: [] },
      ],
    };

    const { journeys } = assembleJourneys(records, { ...SETTLED, topology });
    expect(journeys[0].status).toBe('complete');
  });

  test('a transformer that drops (null out) does not expect downstream -> complete', () => {
    const records: FlowState[] = [
      ...collectorInOut(),
      rec({
        stepId: 'transformer.redact',
        stepType: 'transformer',
        phase: 'in',
        elapsedMs: 3,
      }),
      rec({
        stepId: 'transformer.redact',
        stepType: 'transformer',
        phase: 'out',
        elapsedMs: 4,
        outEvent: null,
      }),
      // destination.gtag never observed because the transformer dropped the event.
    ];
    const topology: JourneyTopology = {
      nodes: [
        { stepId: 'collector.push', downstream: ['transformer.redact'] },
        { stepId: 'transformer.redact', downstream: ['destination.gtag'] },
        { stepId: 'destination.gtag', downstream: [] },
      ],
    };

    const { journeys } = assembleJourneys(records, { ...SETTLED, topology });
    expect(journeys[0].status).toBe('complete');
  });

  test('a skipped hop does not expand: its topology downstream is not expected', () => {
    const records: FlowState[] = [
      ...collectorInOut(),
      rec({
        stepId: 'transformer.gate',
        stepType: 'transformer',
        phase: 'in',
        elapsedMs: 3,
      }),
      rec({
        stepId: 'transformer.gate',
        stepType: 'transformer',
        phase: 'skip',
        elapsedMs: 4,
        skipReason: 'consent',
      }),
      // destination.gtag is downstream of the skipped gate and never observed.
    ];
    const topology: JourneyTopology = {
      nodes: [
        { stepId: 'collector.push', downstream: ['transformer.gate'] },
        { stepId: 'transformer.gate', downstream: ['destination.gtag'] },
        { stepId: 'destination.gtag', downstream: [] },
      ],
    };

    const { journeys } = assembleJourneys(records, { ...SETTLED, topology });
    expect(journeys[0].status).toBe('complete');
  });

  test('a topology cycle terminates the frontier walk', () => {
    const records: FlowState[] = [
      ...collectorInOut(),
      rec({
        stepId: 'destination.a',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 3,
      }),
      rec({
        stepId: 'destination.b',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 4,
      }),
    ];
    const topology: JourneyTopology = {
      nodes: [
        { stepId: 'collector.push', downstream: ['destination.a'] },
        { stepId: 'destination.a', downstream: ['destination.b'] },
        { stepId: 'destination.b', downstream: ['destination.a'] }, // cycle
      ],
    };

    const { journeys } = assembleJourneys(records, { ...SETTLED, topology });
    expect(journeys[0].status).toBe('complete');
  });

  test('cross-platform topology: the crossing is walked from the web root', () => {
    const web: FlowState[] = [
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 3,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 5,
      }),
    ];
    const server: FlowState[] = [
      rec({
        platform: 'server',
        stepId: 'source.ingest',
        stepType: 'source',
        phase: 'in',
        eventId: 'E2',
        parentEventId: 'E1',
        elapsedMs: 0,
        timestamp: iso(40),
      }),
      rec({
        platform: 'server',
        stepId: 'source.ingest',
        stepType: 'source',
        phase: 'out',
        eventId: 'E2',
        parentEventId: 'E1',
        elapsedMs: 1,
        timestamp: iso(41),
      }),
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        eventId: 'E2',
        parentEventId: 'E1',
        elapsedMs: 2,
        timestamp: iso(42),
      }),
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        eventId: 'E2',
        parentEventId: 'E1',
        elapsedMs: 3,
        timestamp: iso(43),
      }),
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'in',
        eventId: 'E2',
        parentEventId: 'E1',
        elapsedMs: 4,
        timestamp: iso(44),
      }),
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'out',
        eventId: 'E2',
        parentEventId: 'E1',
        elapsedMs: 6,
        timestamp: iso(46),
      }),
    ];
    const topology = crossingTopology();

    // All expected steps observed-terminal on both platforms -> complete.
    const all = assembleJourneys([...web, ...server], { ...SETTLED, topology });
    expect(all.journeys).toHaveLength(1);
    expect(all.journeys[0].status).toBe('complete');

    // Dropping the final server destination proves the walk starts at the web
    // root and crosses platforms: the missing expected hop turns it partial.
    const truncated = [...web, ...server.slice(0, 4)];
    const missing = assembleJourneys(truncated, { ...SETTLED, topology });
    expect(missing.journeys[0].status).toBe('partial');
  });

  test('server-only journey in a crossing topology: complete, not held to the web root', () => {
    // A test event sent directly to the server container: no web records at
    // all. The crossing topology has no server ROOT (source.ingest is
    // edge-targeted), so seeding yields nothing and the no-topology rule
    // applies to the observed hops.
    const records: FlowState[] = [
      rec({
        platform: 'server',
        stepId: 'source.ingest',
        stepType: 'source',
        phase: 'in',
        eventId: 'S1',
        traceId: 'TS1',
        elapsedMs: 0,
      }),
      rec({
        platform: 'server',
        stepId: 'source.ingest',
        stepType: 'source',
        phase: 'out',
        eventId: 'S1',
        traceId: 'TS1',
        elapsedMs: 1,
      }),
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        eventId: 'S1',
        traceId: 'TS1',
        elapsedMs: 2,
      }),
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        eventId: 'S1',
        traceId: 'TS1',
        elapsedMs: 3,
      }),
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'in',
        eventId: 'S1',
        traceId: 'TS1',
        elapsedMs: 4,
      }),
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'out',
        eventId: 'S1',
        traceId: 'TS1',
        elapsedMs: 5,
      }),
    ];

    const { journeys } = assembleJourneys(records, {
      ...SETTLED,
      topology: crossingTopology(),
    });
    expect(journeys[0].platforms).toEqual(['server']);
    expect(journeys[0].status).toBe('complete');
  });

  test('web-only journey in a crossing topology: server expected only below a done crossing', () => {
    const webDone: FlowState[] = [
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 3,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 5,
      }),
    ];
    const topology = crossingTopology();

    // The done crossing destination expects the server chain; unobserved -> partial.
    const done = assembleJourneys(webDone, { ...SETTLED, topology });
    expect(done.journeys[0].status).toBe('partial');

    // A skipped crossing does not expand; nothing server-side is expected.
    const webSkipped: FlowState[] = [
      webDone[0],
      webDone[1],
      webDone[2],
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'skip',
        elapsedMs: 5,
        skipReason: 'consent',
      }),
    ];
    const skipped = assembleJourneys(webSkipped, { ...SETTLED, topology });
    expect(skipped.journeys[0].status).toBe('complete');
  });

  test('crossing journey with all web records lost: fallback complete plus lossy', () => {
    // The web half of the crossing never reached the observer; the server
    // poster's seq run shows the loss. platforms = [server] -> no seedable
    // root -> fallback rule; the gap overlap still marks the journey lossy.
    const records: FlowState[] = [
      rec({
        platform: 'server',
        stepId: 'source.ingest',
        stepType: 'source',
        phase: 'in',
        eventId: 'S2',
        parentEventId: 'E1',
        traceId: 'TX',
        seq: 0,
        elapsedMs: 0,
        timestamp: iso(0),
      }),
      rec({
        platform: 'server',
        stepId: 'source.ingest',
        stepType: 'source',
        phase: 'out',
        eventId: 'S2',
        parentEventId: 'E1',
        traceId: 'TX',
        seq: 1,
        elapsedMs: 1,
        timestamp: iso(1),
      }),
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        eventId: 'S2',
        parentEventId: 'E1',
        traceId: 'TX',
        seq: 2,
        elapsedMs: 2,
        timestamp: iso(2),
      }),
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        eventId: 'S2',
        parentEventId: 'E1',
        traceId: 'TX',
        seq: 3,
        elapsedMs: 3,
        timestamp: iso(3),
      }),
      // seq 4-5 dropped on the server poster.
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'in',
        eventId: 'S2',
        parentEventId: 'E1',
        traceId: 'TX',
        seq: 6,
        elapsedMs: 6,
        timestamp: iso(6),
      }),
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'out',
        eventId: 'S2',
        parentEventId: 'E1',
        traceId: 'TX',
        seq: 7,
        elapsedMs: 7,
        timestamp: iso(7),
      }),
    ];

    const { journeys, gaps } = assembleJourneys(records, {
      ...SETTLED,
      topology: crossingTopology(),
    });
    expect(gaps).toHaveLength(1);
    expect(journeys[0].platforms).toEqual(['server']);
    expect(journeys[0].status).toBe('complete');
    expect(journeys[0].lossy).toBe(true);
  });

  test('disjoint per-platform sub-graphs: each journey binds only its platform root', () => {
    const topology: JourneyTopology = {
      nodes: [
        {
          stepId: 'collector.push',
          platform: 'web',
          downstream: ['destination.gtag'],
        },
        { stepId: 'destination.gtag', platform: 'web', downstream: [] },
        {
          stepId: 'collector.push',
          platform: 'server',
          downstream: ['destination.bigquery'],
        },
        { stepId: 'destination.bigquery', platform: 'server', downstream: [] },
      ],
    };
    const webJourney: FlowState[] = [
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 3,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 5,
      }),
    ];
    const serverJourney: FlowState[] = [
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        eventId: 'S3',
        traceId: 'TS3',
        elapsedMs: 0,
        timestamp: iso(100),
      }),
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        eventId: 'S3',
        traceId: 'TS3',
        elapsedMs: 2,
        timestamp: iso(102),
      }),
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'in',
        eventId: 'S3',
        traceId: 'TS3',
        elapsedMs: 3,
        timestamp: iso(103),
      }),
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'out',
        eventId: 'S3',
        traceId: 'TS3',
        elapsedMs: 5,
        timestamp: iso(105),
      }),
    ];

    const { journeys } = assembleJourneys([...webJourney, ...serverJourney], {
      ...SETTLED,
      topology,
    });
    const web = journeys.find((j) => j.id === 'T1');
    const server = journeys.find((j) => j.id === 'TS3');
    // Web binds only the web root (server root not seeded) and vice versa.
    expect(web?.status).toBe('complete');
    expect(server?.status).toBe('complete');
  });
});

describe('assembleJourneys — flush handling and batched terminal', () => {
  test('flush-only batched hop (pre-wire) resolves partial, never wedged pending', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        inEvent: { name: 'page view' },
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
      }),
      // Pre-wire batched destination: only a flush frame (empty eventId), no
      // per-event in/out records yet. Trace matches, so it groups in.
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'flush',
        elapsedMs: 5,
        eventId: '',
        batch: { size: 3, index: 0 },
      }),
    ];

    const { journeys } = assembleJourneys(records, SETTLED);
    expect(journeys).toHaveLength(1);

    const gtag = journeys[0].hops.find((h) => h.stepId === 'destination.gtag');
    expect(gtag?.terminalPhase).toBe('flush');
    expect(gtag?.status).toBe('pending'); // hop non-terminal (flush is not terminal)
    expect(gtag?.batched).toBeUndefined(); // no batched out record
    expect(gtag?.flushConfirmed).toBeUndefined();

    // No topology: partial (a non-terminal hop exists), not wedged pending.
    expect(journeys[0].status).toBe('partial');

    // With topology: also partial (expected downstream observed non-terminal).
    const topology: JourneyTopology = {
      nodes: [
        { stepId: 'collector.push', downstream: ['destination.gtag'] },
        { stepId: 'destination.gtag', downstream: [] },
      ],
    };
    const withTopo = assembleJourneys(records, { ...SETTLED, topology });
    expect(withTopo.journeys[0].status).toBe('partial');
  });

  test('a batched out with a matching flush frame folds in as confirmation', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 1,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 3,
        batch: { size: 2, index: 0 },
      }),
      // Flush frame for the same step, empty eventId, matching trace.
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'flush',
        elapsedMs: 10,
        eventId: '',
        batch: { size: 2, index: 0 },
      }),
    ];

    const hop = assembleJourneys(records, SETTLED).journeys[0].hops[0];
    expect(hop.terminalPhase).toBe('out'); // flush excluded from terminal selection
    expect(hop.batched).toBe(true);
    expect(hop.flushConfirmed).toBe(true);
    expect(hop.status).toBe('done');
    // The flush frame's empty eventId did not become the hop identity.
    expect(hop.eventId).toBe('E1');
    expect(hop.startedAtMs).toBe(1);
  });

  test('batched reads the terminal record: an error over a batched out is not batched', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 3,
        batch: { size: 2, index: 0 },
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'error',
        elapsedMs: 5,
        error: { message: 'later failure' },
      }),
    ];

    const hop = assembleJourneys(records, SETTLED).journeys[0].hops[0];
    expect(hop.terminalPhase).toBe('error');
    expect(hop.batched).toBeUndefined(); // batch read off the terminal (error), not the out
    expect(hop.status).toBe('error');

    // An in-terminal hop (its batched out record lost) proves no enqueue even
    // when the surviving in record carries a batch stamp.
    const inOnly: FlowState[] = [
      rec({
        stepId: 'destination.meta',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 1,
        batch: { size: 2, index: 0 },
      }),
    ];
    const inHop = assembleJourneys(inOnly, SETTLED).journeys[0].hops[0];
    expect(inHop.terminalPhase).toBe('in');
    expect(inHop.batched).toBeUndefined();
  });

  test('a traceless flush frame with empty eventId is dropped, spawning no journey', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'flush',
        elapsedMs: 5,
        eventId: '',
        traceId: undefined,
        batch: { size: 1, index: 0 },
      }),
    ];

    const { journeys } = assembleJourneys(records, SETTLED);
    expect(journeys).toHaveLength(1);
    expect(journeys[0].id).toBe('T1');
    expect(journeys.some((j) => j.id === 'event:')).toBe(false);
  });
});

describe('assembleJourneys — branch fan-out', () => {
  test('parent status from parent records; branches folded; not error-poisoned', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'destination.meta',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 1,
      }),
      rec({
        stepId: 'destination.meta',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 4,
        durationMs: 3,
      }),
      rec({
        stepId: 'destination.meta',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 2,
        branchId: 'b1',
      }),
      rec({
        stepId: 'destination.meta',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 5,
        branchId: 'b1',
        durationMs: 3,
      }),
      rec({
        stepId: 'destination.meta',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 2,
        branchId: 'b2',
      }),
      rec({
        stepId: 'destination.meta',
        stepType: 'destination',
        phase: 'error',
        elapsedMs: 6,
        branchId: 'b2',
        error: { name: 'HttpError', message: 'nope' },
      }),
    ];

    const hop = assembleJourneys(records, SETTLED).journeys[0].hops[0];
    // Parent hop reflects the parent's own outcome ('out'), NOT the b2 error.
    expect(hop.status).toBe('done');
    expect(hop.terminalPhase).toBe('out');

    const branches = hop.branches ?? [];
    expect(branches.map((b) => b.branchId)).toEqual(['b1', 'b2']);

    const b1 = branches.find((b) => b.branchId === 'b1');
    expect(b1?.status).toBe('done');
    expect(b1?.terminalPhase).toBe('out');
    expect(b1?.durationMs).toBe(3);

    const b2 = branches.find((b) => b.branchId === 'b2');
    expect(b2?.status).toBe('error');
    expect(b2?.terminalPhase).toBe('error');
    expect(b2?.error).toEqual({ name: 'HttpError', message: 'nope' });
  });
});

describe('assembleJourneys — gap detection and lossy', () => {
  test('missing seq mid-run yields a gap and marks the overlapping journey lossy', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        seq: 0,
        timestamp: iso(0),
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
        seq: 1,
        timestamp: iso(2),
      }),
      // seq 2 and 3 dropped; next observed seq is 4.
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 10,
        seq: 4,
        timestamp: iso(10),
      }),
    ];

    const { journeys, gaps } = assembleJourneys(records, SETTLED);
    expect(gaps).toEqual([
      {
        platform: 'web',
        fromMs: BASE + 2,
        toMs: BASE + 10,
        afterSeq: 1,
        beforeSeq: 4,
      },
    ]);
    expect(journeys[0].lossy).toBe(true);
  });

  test('seq reset below the run start is a new poster generation, not a gap', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        eventId: 'E1',
        traceId: 'T1',
        seq: 10,
        timestamp: iso(0),
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
        eventId: 'E1',
        traceId: 'T1',
        seq: 11,
        timestamp: iso(2),
      }),
      // Page reload: the poster restarts at seq 0 (below the run start).
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        eventId: 'E2',
        traceId: 'T2',
        seq: 0,
        timestamp: iso(1000),
      }),
      rec({
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
        eventId: 'E2',
        traceId: 'T2',
        seq: 1,
        timestamp: iso(1002),
      }),
    ];

    const { journeys, gaps } = assembleJourneys(records, SETTLED);
    expect(gaps).toEqual([]);
    expect(journeys.every((j) => j.lossy === false)).toBe(true);
  });

  test('a gap on a platform the journey does not touch does not mark it lossy', () => {
    const records: FlowState[] = [
      // Server journey with a seq gap.
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        eventId: 'S1',
        traceId: 'TS',
        seq: 0,
        timestamp: iso(0),
      }),
      rec({
        platform: 'server',
        stepId: 'destination.bigquery',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 5,
        eventId: 'S1',
        traceId: 'TS',
        seq: 5,
        timestamp: iso(5),
      }),
      // Web journey overlapping in wall-clock but on a different platform.
      rec({
        platform: 'web',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 3,
        eventId: 'W1',
        traceId: 'TW',
        timestamp: iso(3),
      }),
    ];

    const { journeys, gaps } = assembleJourneys(records, SETTLED);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].platform).toBe('server');

    const web = journeys.find((j) => j.id === 'TW');
    const server = journeys.find((j) => j.id === 'TS');
    expect(server?.lossy).toBe(true);
    expect(web?.lossy).toBe(false); // web does not touch the server gap
  });

  test('a platform-less gap conservatively marks an overlapping journey lossy', () => {
    const records: FlowState[] = [
      rec({
        platform: undefined,
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        seq: 0,
        timestamp: iso(0),
      }),
      rec({
        platform: undefined,
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
        seq: 1,
        timestamp: iso(2),
      }),
      // seq 2 and 3 dropped on the unstamped poster.
      rec({
        platform: undefined,
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 10,
        seq: 4,
        timestamp: iso(10),
      }),
    ];

    const { journeys, gaps } = assembleJourneys(records, SETTLED);
    expect(gaps).toEqual([
      { fromMs: BASE + 2, toMs: BASE + 10, afterSeq: 1, beforeSeq: 4 },
    ]);
    // The journey has no stamped platform either; the platform-less gap is
    // treated as touching it, so loss is surfaced rather than hidden.
    expect(journeys[0].platforms).toEqual([]);
    expect(journeys[0].lossy).toBe(true);
  });
});

describe('assembleJourneys — entry and structural edge cases', () => {
  test('empty input yields an empty assembly', () => {
    expect(assembleJourneys([], SETTLED)).toEqual({ journeys: [], gaps: [] });
  });

  test('entry falls back to the earliest record when no collector-in exists', () => {
    const records: FlowState[] = [
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'in',
        elapsedMs: 0,
        timestamp: iso(5),
      }),
      rec({
        stepId: 'destination.gtag',
        stepType: 'destination',
        phase: 'out',
        elapsedMs: 3,
        timestamp: iso(8),
      }),
    ];

    const { journeys } = assembleJourneys(records, SETTLED);
    expect(journeys[0].entry.eventId).toBe('E1');
    expect(journeys[0].entry.timestamp).toBe(iso(5));
  });

  test('a parentEventId cycle across segments does not hang or throw', () => {
    const records: FlowState[] = [
      rec({
        platform: 'web',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        eventId: 'E1',
        parentEventId: 'E2',
        traceId: 'T1',
        timestamp: iso(0),
      }),
      rec({
        platform: 'web',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
        eventId: 'E1',
        parentEventId: 'E2',
        traceId: 'T1',
        timestamp: iso(2),
      }),
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        elapsedMs: 0,
        eventId: 'E2',
        parentEventId: 'E1',
        traceId: 'T1',
        timestamp: iso(1),
      }),
      rec({
        platform: 'server',
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'out',
        elapsedMs: 2,
        eventId: 'E2',
        parentEventId: 'E1',
        traceId: 'T1',
        timestamp: iso(3),
      }),
    ];

    const { journeys } = assembleJourneys(records, SETTLED);
    expect(journeys).toHaveLength(1);
    expect([...journeys[0].platforms].sort()).toEqual(['server', 'web']);
  });
});
