import type { FlowState, AssembleJourneysOptions } from '../types';
import { assembleJourneys } from '../journey';

/**
 * Multi-poster assembly: several batched-poster instances (page reloads,
 * container restarts, tabs) feed one session. Each poster stamps seq starting
 * at 1, so records from different posters may carry overlapping (platform,
 * seq) pairs. Assembly must keep them all, dedupe only genuine replays, and
 * keep gap detection truthful.
 */

const BASE = Date.parse('2026-07-27T10:00:00.000Z');

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

/**
 * Trace-less builder: constructs the full literal WITHOUT traceId, so the
 * legacy (eventId) grouping and the trace-less dedupe fallback are exercised
 * without assigning `undefined` to an optional property.
 */
function recNoTrace(overrides: Partial<FlowState>): FlowState {
  return {
    flowId: 'flow1',
    platform: 'web',
    stepId: 'collector.push',
    stepType: 'collector',
    phase: 'in',
    eventId: 'E1',
    timestamp: iso(overrides.elapsedMs ?? 0),
    elapsedMs: 0,
    ...overrides,
  };
}

interface PosterOptions {
  traceId?: string;
  eventId: string;
  name: string;
  platform: 'web' | 'server';
  /** Wall-clock offset of this poster's page load / process start. */
  wallMs: number;
  /** First seq this poster stamps (default 1; >1 simulates a mid-run capture). */
  seqStart?: number;
  /** Omit seq entirely to exercise the seq-less structural-tuple branch. */
  withSeq?: boolean;
}

/** One poster's records for a single event: collector in/out, destination out. */
function posterRecords(over: PosterOptions): FlowState[] {
  const withSeq = over.withSeq ?? true;
  const start = over.seqStart ?? 1;
  const seq = (n: number): Partial<FlowState> =>
    withSeq ? { seq: start + n } : {};
  const build = over.traceId === undefined ? recNoTrace : rec;
  const trace: Partial<FlowState> =
    over.traceId === undefined ? {} : { traceId: over.traceId };
  return [
    build({
      ...seq(0),
      ...trace,
      platform: over.platform,
      eventId: over.eventId,
      stepId: 'collector.push',
      stepType: 'collector',
      phase: 'in',
      inEvent: { name: over.name },
      elapsedMs: 1,
      timestamp: iso(over.wallMs + 1),
    }),
    build({
      ...seq(1),
      ...trace,
      platform: over.platform,
      eventId: over.eventId,
      stepId: 'collector.push',
      stepType: 'collector',
      phase: 'out',
      elapsedMs: 5,
      timestamp: iso(over.wallMs + 5),
    }),
    build({
      ...seq(2),
      ...trace,
      platform: over.platform,
      eventId: over.eventId,
      stepId: 'destination.api',
      stepType: 'destination',
      phase: 'out',
      elapsedMs: 9,
      timestamp: iso(over.wallMs + 9),
    }),
  ];
}

describe('assembleJourneys - multi-poster survival', () => {
  test('two same-platform posters with overlapping seq both survive assembly', () => {
    const loadOne = posterRecords({
      traceId: 'trace-a',
      eventId: 'ev-a',
      name: 'session start',
      platform: 'web',
      wallMs: 0,
    });
    const loadTwo = posterRecords({
      traceId: 'trace-b',
      eventId: 'ev-b',
      name: 'page view',
      platform: 'web',
      wallMs: 10000,
    });

    const out = assembleJourneys([...loadOne, ...loadTwo], SETTLED);

    expect(out.journeys).toHaveLength(2);
    expect(out.gaps).toEqual([]);
    expect(out.journeys.every((j) => j.lossy === false)).toBe(true);
  });

  test('server posters across a container restart both survive', () => {
    const beforeRestart = posterRecords({
      traceId: 'trace-s1',
      eventId: 'ev-s1',
      name: 'order complete',
      platform: 'server',
      wallMs: 0,
    });
    const afterRestart = posterRecords({
      traceId: 'trace-s2',
      eventId: 'ev-s2',
      name: 'order complete',
      platform: 'server',
      wallMs: 60000,
    });

    const out = assembleJourneys([...beforeRestart, ...afterRestart], SETTLED);

    expect(out.journeys).toHaveLength(2);
  });

  test('partial overlap: the longer poster keeps its full run, not just the tail', () => {
    // Poster A emits 2 records (seq 1-2), poster B emits 3 (seq 1-3). Under the
    // broken key B's seq 1-2 collided with A and only B's seq-3 orphan
    // survived, leaving B's journey with a single destination hop.
    const loadOne = posterRecords({
      traceId: 'trace-a',
      eventId: 'ev-a',
      name: 'session start',
      platform: 'web',
      wallMs: 0,
    }).slice(0, 2);
    const loadTwo = posterRecords({
      traceId: 'trace-b',
      eventId: 'ev-b',
      name: 'page view',
      platform: 'web',
      wallMs: 10000,
    });

    const out = assembleJourneys([...loadOne, ...loadTwo], SETTLED);

    expect(out.journeys).toHaveLength(2);
    const journeyB = out.journeys.find((j) => j.traceId === 'trace-b');
    expect(journeyB).toBeDefined();
    expect(journeyB?.hops.map((h) => h.stepId)).toEqual([
      'collector.push',
      'destination.api',
    ]);
  });

  test('different platforms never collide (platform stays in the key)', () => {
    const web = posterRecords({
      traceId: 'trace-w',
      eventId: 'ev-w',
      name: 'page view',
      platform: 'web',
      wallMs: 0,
    });
    const server = posterRecords({
      traceId: 'trace-x',
      eventId: 'ev-x',
      name: 'order complete',
      platform: 'server',
      wallMs: 0,
    });

    const out = assembleJourneys([...web, ...server], SETTLED);

    expect(out.journeys).toHaveLength(2);
  });

  test('seq-less records fall back to the structural tuple and survive across posters', () => {
    const loadOne = posterRecords({
      traceId: 'trace-t1',
      eventId: 'ev-t1',
      name: 'page view',
      platform: 'web',
      wallMs: 0,
      withSeq: false,
    });
    const loadTwo = posterRecords({
      traceId: 'trace-t2',
      eventId: 'ev-t2',
      name: 'page view',
      platform: 'web',
      wallMs: 10000,
      withSeq: false,
    });

    const out = assembleJourneys([...loadOne, ...loadTwo], SETTLED);

    expect(out.journeys).toHaveLength(2);
  });

  test('seq-stamped trace-less records survive across posters (timestamp-extended fallback)', () => {
    // No traceId, eventId set: legacy grouping. Live, the only trace-less
    // records are init/flush frames, but the fallback must hold for any
    // trace-less emitter.
    const loadOne = posterRecords({
      eventId: 'legacy-a',
      name: 'page view',
      platform: 'web',
      wallMs: 0,
    });
    const loadTwo = posterRecords({
      eventId: 'legacy-b',
      name: 'page view',
      platform: 'web',
      wallMs: 10000,
    });

    const out = assembleJourneys([...loadOne, ...loadTwo], SETTLED);

    expect(out.journeys).toHaveLength(2);
    expect(out.journeys.map((j) => j.correlation)).toEqual([
      'legacy',
      'legacy',
    ]);
  });

  test('exact replay of a multi-poster stream is idempotent', () => {
    const all = [
      ...posterRecords({
        traceId: 'trace-a',
        eventId: 'ev-a',
        name: 'session start',
        platform: 'web',
        wallMs: 0,
      }),
      ...posterRecords({
        traceId: 'trace-b',
        eventId: 'ev-b',
        name: 'page view',
        platform: 'web',
        wallMs: 10000,
      }),
    ];

    const once = assembleJourneys(all, SETTLED);
    const replayed = assembleJourneys([...all, ...all], SETTLED);

    expect(replayed.journeys).toHaveLength(once.journeys.length);
    expect(replayed.gaps).toEqual(once.gaps);
  });
});

describe('assembleJourneys - multi-poster gap truthfulness', () => {
  test('sequential posters produce no false gaps', () => {
    const loadOne = posterRecords({
      traceId: 'trace-a',
      eventId: 'ev-a',
      name: 'session start',
      platform: 'web',
      wallMs: 0,
    });
    const loadTwo = posterRecords({
      traceId: 'trace-b',
      eventId: 'ev-b',
      name: 'page view',
      platform: 'web',
      wallMs: 10000,
    });

    const out = assembleJourneys([...loadOne, ...loadTwo], SETTLED);

    expect(out.gaps).toEqual([]);
  });

  test('a within-poster drop still reports a gap when a second poster is present', () => {
    // Poster A drops its seq-3 record (a failed POST chunk): 1, 2, 4.
    const a1 = rec({
      seq: 1,
      traceId: 'trace-a',
      eventId: 'ev-a',
      phase: 'in',
      inEvent: { name: 'session start' },
      elapsedMs: 1,
      timestamp: iso(1),
    });
    const a2 = rec({
      seq: 2,
      traceId: 'trace-a',
      eventId: 'ev-a',
      phase: 'out',
      elapsedMs: 5,
      timestamp: iso(5),
    });
    const a4 = rec({
      seq: 4,
      traceId: 'trace-a',
      eventId: 'ev-a',
      stepId: 'destination.api',
      stepType: 'destination',
      phase: 'out',
      elapsedMs: 9,
      timestamp: iso(9),
    });
    const loadTwo = posterRecords({
      traceId: 'trace-b',
      eventId: 'ev-b',
      name: 'page view',
      platform: 'web',
      wallMs: 60000,
    });

    const out = assembleJourneys([a1, a2, a4, ...loadTwo], SETTLED);

    expect(out.gaps).toHaveLength(1);
    expect(out.gaps[0]).toMatchObject({ afterSeq: 2, beforeSeq: 4 });
    const journeyA = out.journeys.find((j) => j.traceId === 'trace-a');
    const journeyB = out.journeys.find((j) => j.traceId === 'trace-b');
    expect(journeyA?.lossy).toBe(true);
    expect(journeyB?.lossy).toBe(false);
  });

  test('KNOWN LIMITATION: interleaved same-platform posters report a false gap', () => {
    // Poster A is mid-run (seq 5, 6) while poster B starts (seq 1, 2), records
    // interleaved in wall-clock time. detectGaps walks per platform in time
    // order and reads 1 -> 6 as a hole. This over-reports loss (never hides
    // it); the Option B poster-instance id removes it by segmenting seq runs
    // per poster. If this test starts failing with gaps: [], that fix landed:
    // fold this case into the truthful set.
    const a5 = rec({
      seq: 5,
      traceId: 'trace-a',
      eventId: 'ev-a',
      phase: 'in',
      inEvent: { name: 'page view' },
      elapsedMs: 1,
      timestamp: iso(0),
    });
    const b1 = rec({
      seq: 1,
      traceId: 'trace-b',
      eventId: 'ev-b',
      phase: 'in',
      inEvent: { name: 'page view' },
      elapsedMs: 1,
      timestamp: iso(10),
    });
    const a6 = rec({
      seq: 6,
      traceId: 'trace-a',
      eventId: 'ev-a',
      phase: 'out',
      elapsedMs: 21,
      timestamp: iso(20),
    });
    const b2 = rec({
      seq: 2,
      traceId: 'trace-b',
      eventId: 'ev-b',
      phase: 'out',
      elapsedMs: 21,
      timestamp: iso(30),
    });

    const out = assembleJourneys([a5, b1, a6, b2], SETTLED);

    expect(out.journeys).toHaveLength(2);
    expect(out.gaps).toHaveLength(1);
  });
});
