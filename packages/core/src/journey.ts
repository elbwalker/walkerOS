import type { FlowState, FlowStatePhase } from './types/telemetry';
import type {
  AssembleJourneysOptions,
  Journey,
  JourneyAssembly,
  JourneyBranch,
  JourneyCorrelation,
  JourneyEntry,
  JourneyGap,
  JourneyHop,
  JourneyHopStatus,
  JourneyPlatform,
  JourneyStatus,
  JourneyTopology,
  JourneyTopologyNode,
} from './types/journey';

/** Default settle window: a journey may still change until its last record is this old. */
const DEFAULT_SETTLE_MS = 15000;

/** Terminal precedence: error beats skip beats out beats in beats init beats flush. */
const PHASE_RANK: Record<FlowStatePhase, number> = {
  error: 5,
  skip: 4,
  out: 3,
  in: 2,
  init: 1,
  flush: 0,
};

/** Segment key for a platform-less hop; distinct from any real platform value. */
const NO_PLATFORM = '\0none';

/** Field separator for composite string keys; cannot occur in the values. */
const SEP = '\0';

/** Composite `(platform, stepId)` key; the file's one identity for hops and topology nodes. */
function keyOf(platform: JourneyPlatform | undefined, stepId: string): string {
  return `${platform ?? NO_PLATFORM}${SEP}${stepId}`;
}

/** Parse an ISO timestamp to epoch ms, treating an unparseable value as 0. */
function toEpoch(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Total order over records so every downstream reduction (terminal selection,
 * tie-breaks, entry choice) is independent of input order.
 */
function compareRecords(a: FlowState, b: FlowState): number {
  const pa = a.platform ?? '';
  const pb = b.platform ?? '';
  if (pa !== pb) return pa < pb ? -1 : 1;
  if (a.stepId !== b.stepId) return a.stepId < b.stepId ? -1 : 1;
  if (a.phase !== b.phase) return PHASE_RANK[a.phase] - PHASE_RANK[b.phase];
  if (a.eventId !== b.eventId) return a.eventId < b.eventId ? -1 : 1;
  const ba = a.branchId ?? '';
  const bb = b.branchId ?? '';
  if (ba !== bb) return ba < bb ? -1 : 1;
  if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs - b.elapsedMs;
  const sa = a.seq ?? -1;
  const sb = b.seq ?? -1;
  if (sa !== sb) return sa - sb;
  if (a.timestamp !== b.timestamp) return a.timestamp < b.timestamp ? -1 : 1;
  return 0;
}

/**
 * Drop replayed duplicates. Prefer the poster's `(platform, seq)` identity when
 * `seq` is present; otherwise fall back to the structural tuple. First
 * occurrence wins.
 */
function dedupe(records: FlowState[]): FlowState[] {
  const seen = new Set<string>();
  const out: FlowState[] = [];
  for (const r of records) {
    const key =
      r.seq !== undefined
        ? `seq${SEP}${r.platform ?? ''}${SEP}${r.seq}`
        : `tuple${SEP}${r.stepId}${SEP}${r.phase}${SEP}${r.eventId}${SEP}${
            r.branchId ?? ''
          }${SEP}${r.elapsedMs}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** Read a `name` string off an inbound event without loosening the type. */
function readEventName(inEvent: unknown): string | undefined {
  if (
    typeof inEvent === 'object' &&
    inEvent !== null &&
    'name' in inEvent &&
    typeof inEvent.name === 'string'
  ) {
    return inEvent.name;
  }
  return undefined;
}

/** Map a hop's terminal phase to its collapsed status. */
function hopStatusFor(phase: FlowStatePhase): JourneyHopStatus {
  switch (phase) {
    case 'error':
      return 'error';
    case 'skip':
      return 'skipped';
    case 'out':
      return 'done';
    case 'in':
    case 'init':
    case 'flush':
      return 'pending';
  }
}

/** A hop has reached a settled outcome: delivered, errored, skipped, or batch-enqueued. */
function isHopTerminal(hop: JourneyHop): boolean {
  return (
    hop.terminalPhase === 'out' ||
    hop.terminalPhase === 'error' ||
    hop.terminalPhase === 'skip' ||
    hop.batched === true
  );
}

/**
 * Whether a done hop propagates expectation to its downstream steps. Only `done`
 * hops expand (`skipped`/`error`/`pending` stop the frontier); a transformer
 * that produced no output (`out` null or absent) dropped the event, so nothing
 * flows on.
 */
function hopExpands(hop: JourneyHop): boolean {
  if (hop.status !== 'done') return false;
  if (
    hop.stepType === 'transformer' &&
    (hop.out === null || hop.out === undefined)
  )
    return false;
  return true;
}

/** One topology node with its rank (index in `nodes`) and composite identity. */
interface TopoNode {
  node: JourneyTopologyNode;
  rank: number;
  key: string;
}

/**
 * Topology precomputed once per `assembleJourneys` call: composite
 * `(platform, stepId)` keying throughout, resolved downstream edges, and the
 * root set (nodes no resolved edge targets).
 */
interface TopologyIndex {
  /** Node by composite key; on duplicate keys the first (lowest-rank) node wins. */
  byKey: Map<string, TopoNode>;
  /** All nodes sharing a bare stepId, for unique-match fallbacks. */
  byStepId: Map<string, TopoNode[]>;
  /** Resolved downstream targets per source node key. */
  edges: Map<string, TopoNode[]>;
  /** Nodes that are not the resolved target of any edge, in rank order. */
  roots: TopoNode[];
}

/**
 * Resolve one downstream entry of `source`: the node with that stepId AND the
 * source's platform; if none, the unique node with that stepId regardless of
 * platform (the $flow crossing case); if still ambiguous, the edge is ignored.
 */
function resolveEdgeTarget(
  source: TopoNode,
  stepId: string,
  byKey: Map<string, TopoNode>,
  byStepId: Map<string, TopoNode[]>,
): TopoNode | undefined {
  const samePlatform = byKey.get(keyOf(source.node.platform, stepId));
  if (samePlatform !== undefined) return samePlatform;
  const candidates = byStepId.get(stepId);
  if (candidates !== undefined && candidates.length === 1) return candidates[0];
  return undefined;
}

/** Build the per-call topology index. */
function indexTopology(topology: JourneyTopology): TopologyIndex {
  const byKey = new Map<string, TopoNode>();
  const byStepId = new Map<string, TopoNode[]>();
  topology.nodes.forEach((node, rank) => {
    const info: TopoNode = {
      node,
      rank,
      key: keyOf(node.platform, node.stepId),
    };
    if (!byKey.has(info.key)) byKey.set(info.key, info);
    const list = byStepId.get(node.stepId);
    if (list) list.push(info);
    else byStepId.set(node.stepId, [info]);
  });

  const edges = new Map<string, TopoNode[]>();
  const targeted = new Set<string>();
  for (const info of byKey.values()) {
    const resolved: TopoNode[] = [];
    for (const d of info.node.downstream) {
      const target = resolveEdgeTarget(info, d, byKey, byStepId);
      if (target !== undefined) {
        resolved.push(target);
        targeted.add(target.key);
      }
    }
    edges.set(info.key, resolved);
  }

  const roots: TopoNode[] = [];
  for (const info of byKey.values())
    if (!targeted.has(info.key)) roots.push(info);
  roots.sort((a, b) => a.rank - b.rank);

  return { byKey, byStepId, edges, roots };
}

/**
 * Node an observed hop belongs to: exact `(platform, stepId)` match first, then
 * the platform-less node with that stepId, then the unique stepId match.
 */
function nodeForHop(
  topo: TopologyIndex,
  stepId: string,
  platform: JourneyPlatform | undefined,
): TopoNode | undefined {
  const exact = topo.byKey.get(keyOf(platform, stepId));
  if (exact !== undefined) return exact;
  const platformless = topo.byKey.get(keyOf(undefined, stepId));
  if (platformless !== undefined) return platformless;
  const candidates = topo.byStepId.get(stepId);
  if (candidates !== undefined && candidates.length === 1) return candidates[0];
  return undefined;
}

/**
 * Topology frontier walk. Seeding is platform-scoped: only roots whose platform
 * the journey touched (platform-less roots always) — a root on an untouched
 * platform is a sibling entry point, not missing work, so disjoint per-platform
 * sub-graphs are safe. Downstream expansion stays edge-driven and crosses
 * platforms (a done crossing hop still expects the far side's chain). When
 * seeding yields no roots (e.g. a server-only journey whose platform's entry is
 * only ever edge-targeted by a crossing), an empty walk would be vacuously
 * complete, so the no-topology rule applies instead: complete iff every
 * observed hop is terminal. Otherwise every expected step must be observed and
 * terminal for `complete`, else `partial`.
 */
function frontierStatus(
  hops: JourneyHop[],
  platforms: JourneyPlatform[],
  topo: TopologyIndex,
): JourneyStatus {
  const findHop = (info: TopoNode): JourneyHop | undefined =>
    hops.find(
      (h) =>
        h.stepId === info.node.stepId &&
        (info.node.platform === undefined || h.platform === info.node.platform),
    );

  const seeded = topo.roots.filter(
    (r) => r.node.platform === undefined || platforms.includes(r.node.platform),
  );
  if (seeded.length === 0)
    return hops.every(isHopTerminal) ? 'complete' : 'partial';

  const expected = new Map<string, TopoNode>();
  const queue: TopoNode[] = seeded;
  while (queue.length > 0) {
    const info = queue.shift();
    if (info === undefined) break;
    if (expected.has(info.key)) continue;
    expected.set(info.key, info);
    const hop = findHop(info);
    if (hop !== undefined && hopExpands(hop)) {
      const targets = topo.edges.get(info.key);
      if (targets !== undefined)
        for (const t of targets) if (!expected.has(t.key)) queue.push(t);
    }
  }

  for (const info of expected.values()) {
    const hop = findHop(info);
    if (hop === undefined || !isHopTerminal(hop)) return 'partial';
  }
  return 'complete';
}

/**
 * Journey completeness. `pending` until the settle window elapses (more records
 * may still arrive; `lastTimestamp` is the max over all records, so a single
 * fresh hop keeps the whole journey pending). After settle: with a topology,
 * the frontier walk decides; without one, `complete` iff every observed hop is
 * terminal, else `partial`.
 */
function resolveStatus(
  hops: JourneyHop[],
  platforms: JourneyPlatform[],
  lastTimestamp: number,
  topo: TopologyIndex | undefined,
  settleMs: number,
  now: number,
): JourneyStatus {
  if (now - lastTimestamp < settleMs) return 'pending';
  if (topo !== undefined) return frontierStatus(hops, platforms, topo);
  return hops.every(isHopTerminal) ? 'complete' : 'partial';
}

/**
 * Per-platform loss windows from the monotonic `seq` counter. Records are walked
 * in wall-clock order within each platform (`seq` is stamped per poster): a jump
 * of more than one is a gap (records dropped); a backward jump is a counter
 * reset (a new poster generation, e.g. a page reload) and never a loss. Bounds
 * come from the records adjacent to the gap.
 */
function detectGaps(records: FlowState[]): JourneyGap[] {
  const byPlatform = new Map<string, FlowState[]>();
  for (const r of records) {
    if (r.seq === undefined) continue;
    const key = r.platform ?? NO_PLATFORM;
    const list = byPlatform.get(key);
    if (list) list.push(r);
    else byPlatform.set(key, [r]);
  }

  const gaps: JourneyGap[] = [];
  for (const key of [...byPlatform.keys()].sort()) {
    const list = byPlatform.get(key);
    if (list === undefined) continue;
    const ordered = [...list].sort((a, b) => {
      const ta = toEpoch(a.timestamp);
      const tb = toEpoch(b.timestamp);
      if (ta !== tb) return ta - tb;
      return (a.seq ?? 0) - (b.seq ?? 0);
    });

    let prev: FlowState | undefined;
    let prevSeq = 0;
    for (const cur of ordered) {
      const seq = cur.seq;
      if (seq === undefined) continue;
      if (prev === undefined) {
        prev = cur;
        prevSeq = seq;
        continue;
      }
      if (seq === prevSeq) continue; // duplicate (deduped upstream); ignore
      if (seq === prevSeq + 1) {
        prev = cur;
        prevSeq = seq;
        continue;
      }
      if (seq > prevSeq + 1) {
        const platform = cur.platform;
        gaps.push({
          ...(platform !== undefined ? { platform } : {}),
          fromMs: toEpoch(prev.timestamp),
          toMs: toEpoch(cur.timestamp),
          afterSeq: prevSeq,
          beforeSeq: seq,
        });
      }
      // seq > prevSeq+1 (gap, recorded above) or seq < prevSeq (reset): the new
      // record starts the ongoing run either way.
      prev = cur;
      prevSeq = seq;
    }
  }
  return gaps;
}

/**
 * A journey is lossy when its wall-clock window overlaps a gap on a platform it
 * touches. A platform-less gap (records the observer never stamped) is treated
 * conservatively as touching any journey, so loss is surfaced rather than hidden.
 */
function isLossy(
  platforms: JourneyPlatform[],
  firstTimestamp: number,
  lastTimestamp: number,
  gaps: JourneyGap[],
): boolean {
  for (const gap of gaps) {
    const touches =
      gap.platform === undefined || platforms.includes(gap.platform);
    if (!touches) continue;
    if (firstTimestamp <= gap.toMs && gap.fromMs <= lastTimestamp) return true;
  }
  return false;
}

/** Collapse one branch's records (branch-scoped, non-flush) into a JourneyBranch. */
function collapseBranch(branchId: string, records: FlowState[]): JourneyBranch {
  let terminal = records[0];
  let outRecord: FlowState | undefined;
  let outPayload: unknown;
  for (const r of records) {
    if (PHASE_RANK[r.phase] > PHASE_RANK[terminal.phase]) terminal = r;
    if (r.phase === 'out') outRecord = r;
    if (r.outEvent !== undefined) outPayload = r.outEvent;
  }

  const terminalPhase = terminal.phase;
  const durationMs = outRecord?.durationMs;
  const skipReason = terminalPhase === 'skip' ? terminal.skipReason : undefined;
  const error = terminalPhase === 'error' ? terminal.error : undefined;
  const calls = outRecord?.calls;

  return {
    branchId,
    status: hopStatusFor(terminalPhase),
    terminalPhase,
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(skipReason !== undefined ? { skipReason } : {}),
    ...(error !== undefined ? { error } : {}),
    ...(outPayload !== undefined ? { out: outPayload } : {}),
    ...(calls !== undefined ? { calls } : {}),
  };
}

/**
 * Collapse all records for one `(platform, stepId)` pair into a single hop.
 * `flush` frames are excluded from identity, terminal selection, and field
 * harvest (their empty eventId must not become the hop's), but still fold in as
 * batch confirmation and still count toward `startedAtMs` (port parity).
 * `branchId` records fan out into `branches` rather than colouring the parent.
 */
function collapseHop(group: FlowState[]): JourneyHop {
  // startedAtMs/timestamp anchor over ALL records incl. flush (port parity).
  let anchor = group[0];
  for (const r of group) if (r.elapsedMs < anchor.elapsedMs) anchor = r;

  const parentRecords: FlowState[] = [];
  const branchGroups = new Map<string, FlowState[]>();
  let hasFlush = false;
  for (const r of group) {
    if (r.phase === 'flush') {
      hasFlush = true;
      continue;
    }
    if (r.branchId !== undefined) {
      const list = branchGroups.get(r.branchId);
      if (list) list.push(r);
      else branchGroups.set(r.branchId, [r]);
      continue;
    }
    parentRecords.push(r);
  }

  // Parent collapse source: own (non-branch) records; a branch-only hop falls
  // back to its branch records, a flush-only hop to the flush frames, so the
  // hop still resolves identity and a (non-terminal) outcome.
  const branchRecords = [...branchGroups.values()].flat();
  const source =
    parentRecords.length > 0
      ? parentRecords
      : branchRecords.length > 0
        ? branchRecords
        : group;

  let identity = source[0];
  let terminal = source[0];
  let outRecord: FlowState | undefined;
  let inPayload: unknown;
  let outPayload: unknown;
  let mappingKey: string | undefined;
  let contractRule: string | undefined;
  let consent: Record<string, boolean> | undefined;
  let consentApplied: Record<string, boolean> | undefined;
  let meta: Record<string, unknown> | undefined;
  let parentEventId: string | undefined;

  for (const r of source) {
    if (r.elapsedMs < identity.elapsedMs) identity = r;
    if (PHASE_RANK[r.phase] > PHASE_RANK[terminal.phase]) terminal = r;
    if (r.phase === 'out') outRecord = r;
    if (r.inEvent !== undefined && inPayload === undefined)
      inPayload = r.inEvent;
    if (r.outEvent !== undefined) outPayload = r.outEvent;
    if (r.mappingKey !== undefined) mappingKey = r.mappingKey;
    if (r.contractRule !== undefined) contractRule = r.contractRule;
    if (r.consent !== undefined) consent = r.consent;
    if (r.consentApplied !== undefined) consentApplied = r.consentApplied;
    if (r.meta !== undefined) meta = r.meta;
    if (r.parentEventId !== undefined && parentEventId === undefined)
      parentEventId = r.parentEventId;
  }

  const terminalPhase = terminal.phase;
  const durationMs = outRecord?.durationMs;
  const error = terminalPhase === 'error' ? terminal.error : undefined;
  const skipReason = terminalPhase === 'skip' ? terminal.skipReason : undefined;
  const calls = outRecord?.calls;
  // batched requires the TERMINAL record to be a batch-stamped out: an
  // error/skip terminal over a batched out is not a successful enqueue, a
  // flush terminal's batch field describes the flush (not this hop's enqueue),
  // and an in/init terminal (batched out record lost) proves nothing.
  const batched =
    terminal.phase === 'out' && terminal.batch !== undefined ? true : undefined;
  // A flush frame confirms the batch was flushed, but only on a batched hop; a
  // pre-wire flush-only frame leaves the hop non-terminal and unconfirmed.
  const flushConfirmed = hasFlush && batched === true ? true : undefined;

  const branches =
    branchGroups.size > 0
      ? [...branchGroups.entries()]
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([branchId, recs]) => collapseBranch(branchId, recs))
      : undefined;

  return {
    stepId: identity.stepId,
    stepType: identity.stepType,
    eventId: identity.eventId,
    status: hopStatusFor(terminalPhase),
    terminalPhase,
    startedAtMs: anchor.elapsedMs,
    timestamp: anchor.timestamp,
    ...(identity.platform !== undefined ? { platform: identity.platform } : {}),
    ...(parentEventId !== undefined ? { parentEventId } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(inPayload !== undefined ? { in: inPayload } : {}),
    ...(outPayload !== undefined ? { out: outPayload } : {}),
    ...(error !== undefined ? { error } : {}),
    ...(skipReason !== undefined ? { skipReason } : {}),
    ...(mappingKey !== undefined ? { mappingKey } : {}),
    ...(contractRule !== undefined ? { contractRule } : {}),
    ...(consent !== undefined ? { consent } : {}),
    ...(consentApplied !== undefined ? { consentApplied } : {}),
    ...(calls !== undefined ? { calls } : {}),
    ...(branches !== undefined ? { branches } : {}),
    ...(batched !== undefined ? { batched } : {}),
    ...(flushConfirmed !== undefined ? { flushConfirmed } : {}),
    ...(meta !== undefined ? { meta } : {}),
  };
}

/** A platform segment: the hops of one runtime, ordered within the segment. */
interface Segment {
  platform?: JourneyPlatform;
  hops: JourneyHop[];
  ownedEventIds: Set<string>;
  parentEventIds: Set<string>;
  minEpoch: number;
}

/** Order the hops within one platform segment; ranks precomputed, not per comparison. */
function orderWithinSegment(
  hops: JourneyHop[],
  topo: TopologyIndex | undefined,
): JourneyHop[] {
  const entries = hops.map((hop) => ({
    hop,
    rank:
      topo !== undefined
        ? (nodeForHop(topo, hop.stepId, hop.platform)?.rank ??
          Number.MAX_SAFE_INTEGER)
        : 0,
  }));
  entries.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.hop.startedAtMs !== b.hop.startedAtMs)
      return a.hop.startedAtMs - b.hop.startedAtMs;
    return a.hop.stepId < b.hop.stepId
      ? -1
      : a.hop.stepId > b.hop.stepId
        ? 1
        : 0;
  });
  return entries.map((e) => e.hop);
}

/**
 * Order platform segments by the `parentEventId` chain (a segment referencing
 * another segment's event id comes after it), then wall-clock, then platform.
 */
function orderSegments(segments: Segment[]): Segment[] {
  const parentOf = new Map<number, number>();
  const stableIndexOrder = segments
    .map((_, i) => i)
    .sort((i, j) => {
      const pi = segments[i].platform ?? NO_PLATFORM;
      const pj = segments[j].platform ?? NO_PLATFORM;
      return pi < pj ? -1 : pi > pj ? 1 : 0;
    });

  segments.forEach((seg, i) => {
    if (seg.parentEventIds.size === 0) return;
    for (const j of stableIndexOrder) {
      if (j === i) continue;
      let hit = false;
      for (const owned of segments[j].ownedEventIds) {
        if (seg.parentEventIds.has(owned)) {
          hit = true;
          break;
        }
      }
      if (hit) {
        parentOf.set(i, j);
        break;
      }
    }
  });

  const depth = (start: number): number => {
    let d = 0;
    let cur = start;
    const seen = new Set<number>();
    for (;;) {
      if (seen.has(cur)) break;
      seen.add(cur);
      const p = parentOf.get(cur);
      if (p === undefined) break;
      cur = p;
      d += 1;
    }
    return d;
  };

  return segments
    .map((seg, i) => ({ seg, i, depth: depth(i) }))
    .sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      if (a.seg.minEpoch !== b.seg.minEpoch)
        return a.seg.minEpoch - b.seg.minEpoch;
      const pa = a.seg.platform ?? NO_PLATFORM;
      const pb = b.seg.platform ?? NO_PLATFORM;
      return pa < pb ? -1 : pa > pb ? 1 : 0;
    })
    .map((x) => x.seg);
}

/** Pick the originating entry record: earliest collector-in by wall-clock, else earliest record. */
function pickEntry(records: FlowState[]): JourneyEntry {
  const collectorIns = records.filter(
    (r) => r.stepType === 'collector' && r.phase === 'in',
  );
  const pool = collectorIns.length > 0 ? collectorIns : records;

  let entryRec = pool[0];
  let best = toEpoch(entryRec.timestamp);
  for (const r of pool) {
    const ms = toEpoch(r.timestamp);
    if (ms < best) {
      best = ms;
      entryRec = r;
    }
  }

  const name = readEventName(entryRec.inEvent);
  return {
    eventId: entryRec.eventId,
    timestamp: entryRec.timestamp,
    ...(name !== undefined ? { name } : {}),
    ...(entryRec.sourceId !== undefined ? { sourceId: entryRec.sourceId } : {}),
    ...(entryRec.platform !== undefined ? { platform: entryRec.platform } : {}),
  };
}

/** Shared, journey-independent inputs threaded into each journey's assembly. */
interface AssembleContext {
  topo?: TopologyIndex;
  settleMs: number;
  now: number;
  gaps: JourneyGap[];
}

/** Assemble one correlation group (already sorted) into a Journey. */
function assembleJourney(
  id: string,
  correlation: JourneyCorrelation,
  traceId: string | undefined,
  records: FlowState[],
  ctx: AssembleContext,
): Journey {
  const { topo } = ctx;
  // Collapse per (platform, stepId).
  const hopGroups = new Map<string, FlowState[]>();
  for (const r of records) {
    const key = keyOf(r.platform, r.stepId);
    const group = hopGroups.get(key);
    if (group) group.push(r);
    else hopGroups.set(key, [r]);
  }
  const hops = [...hopGroups.values()].map(collapseHop);

  // Group hops into platform segments.
  const segmentMap = new Map<string, Segment>();
  for (const hop of hops) {
    const key = hop.platform ?? NO_PLATFORM;
    let seg = segmentMap.get(key);
    if (!seg) {
      seg = {
        ...(hop.platform !== undefined ? { platform: hop.platform } : {}),
        hops: [],
        ownedEventIds: new Set<string>(),
        parentEventIds: new Set<string>(),
        minEpoch: Number.POSITIVE_INFINITY,
      };
      segmentMap.set(key, seg);
    }
    seg.hops.push(hop);
    seg.ownedEventIds.add(hop.eventId);
    if (hop.parentEventId !== undefined)
      seg.parentEventIds.add(hop.parentEventId);
    seg.minEpoch = Math.min(seg.minEpoch, toEpoch(hop.timestamp));
  }

  const orderedSegments = orderSegments([...segmentMap.values()]);
  const orderedHops: JourneyHop[] = [];
  const platforms: JourneyPlatform[] = [];
  for (const seg of orderedSegments) {
    if (seg.platform !== undefined && !platforms.includes(seg.platform))
      platforms.push(seg.platform);
    for (const hop of orderWithinSegment(seg.hops, topo)) orderedHops.push(hop);
  }

  let firstTimestamp = Number.POSITIVE_INFINITY;
  let lastTimestamp = Number.NEGATIVE_INFINITY;
  for (const r of records) {
    const ms = toEpoch(r.timestamp);
    if (ms < firstTimestamp) firstTimestamp = ms;
    if (ms > lastTimestamp) lastTimestamp = ms;
  }

  const status = resolveStatus(
    orderedHops,
    platforms,
    lastTimestamp,
    topo,
    ctx.settleMs,
    ctx.now,
  );
  const lossy = isLossy(platforms, firstTimestamp, lastTimestamp, ctx.gaps);

  return {
    id,
    correlation,
    ...(traceId !== undefined ? { traceId } : {}),
    entry: pickEntry(records),
    hops: orderedHops,
    platforms,
    status,
    lossy,
    firstTimestamp,
    lastTimestamp,
    totalMs: lastTimestamp - firstTimestamp,
  };
}

/**
 * Pure assembly of raw `FlowState` records into cross-runtime journeys. The
 * function is idempotent (duplicate records are deduped first) and
 * deterministic (output does not depend on input order; `options.now` supplies
 * the settle reference so tests never depend on the wall clock). It resolves
 * completeness (`pending`/`complete`/`partial`) against the settle window and,
 * when supplied, the topology frontier; loss is detected from per-platform
 * `seq` gaps and surfaced both session-level (`gaps`) and per journey (`lossy`).
 * Journeys are returned oldest-first by `firstTimestamp`; presenters re-sort as
 * needed. Each call recomputes everything from the raw records (there is no
 * incremental mode), so callers that re-resolve status on a settle tick re-run
 * the whole pipeline and should memoize on their inputs.
 */
export function assembleJourneys(
  records: FlowState[],
  options?: AssembleJourneysOptions,
): JourneyAssembly {
  const ctx: AssembleContext = {
    ...(options?.topology !== undefined
      ? { topo: indexTopology(options.topology) }
      : {}),
    settleMs: options?.settleMs ?? DEFAULT_SETTLE_MS,
    now: options?.now ?? Date.now(),
    gaps: [],
  };

  const deduped = dedupe(records);
  const sorted = [...deduped].sort(compareRecords);

  // Gaps are detected over all records (flush frames carry `seq` too, so keep
  // them here to preserve the poster's monotonic run) before any grouping.
  ctx.gaps = detectGaps(deduped);

  // Drop unusable traceless flush frames (empty eventId AND no traceId) so they
  // never spawn a junk `event:` journey. A flush frame WITH a traceId still
  // folds into its trace-matched journey; a traceless one carries nothing.
  const groupable = sorted.filter((r) => !(r.eventId === '' && !r.traceId));

  // Group into correlation groups: by traceId, else by eventId (legacy).
  interface Group {
    id: string;
    correlation: JourneyCorrelation;
    traceId?: string;
    records: FlowState[];
  }
  const groups = new Map<string, Group>();
  for (const r of groupable) {
    const trace = r.traceId ? r.traceId : undefined;
    const key = trace ? `trace${SEP}${trace}` : `event${SEP}${r.eventId}`;
    let group = groups.get(key);
    if (!group) {
      group = trace
        ? { id: trace, correlation: 'trace', traceId: trace, records: [] }
        : { id: `event:${r.eventId}`, correlation: 'legacy', records: [] };
      groups.set(key, group);
    }
    group.records.push(r);
  }

  const journeys = [...groups.values()].map((g) =>
    assembleJourney(g.id, g.correlation, g.traceId, g.records, ctx),
  );

  journeys.sort((a, b) => {
    if (a.firstTimestamp !== b.firstTimestamp)
      return a.firstTimestamp - b.firstTimestamp;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return { journeys, gaps: ctx.gaps };
}
