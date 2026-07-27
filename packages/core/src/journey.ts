import type { FlowState, FlowStatePhase } from './types/telemetry';
import type {
  AssembleJourneysOptions,
  Journey,
  JourneyAssembly,
  JourneyBranch,
  JourneyEntry,
  JourneyGap,
  JourneyHop,
  JourneyHopStatus,
  JourneyPlatform,
  JourneyStatus,
  JourneyTopology,
  JourneyTopologyNode,
  JourneyUnattributed,
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
 * Drop replayed duplicates. `seq` is a PER-POSTER-INSTANCE counter (it
 * restarts at 1 on every page load and container restart), so it is only an
 * identity within one event run: the key scopes it with `traceId`, which a
 * genuine replay repeats and a new poster never does. A seq-stamped record
 * without a traceId falls back to its structural tuple extended with
 * `timestamp` (a replay repeats the timestamp exactly; distinct posters
 * differ). Seq-less records keep the plain structural tuple. First
 * occurrence wins.
 */
function dedupe(records: FlowState[]): FlowState[] {
  const seen = new Set<string>();
  const out: FlowState[] = [];
  for (const r of records) {
    const key =
      r.seq !== undefined && r.traceId
        ? `seq${SEP}${r.platform ?? ''}${SEP}${r.traceId}${SEP}${r.seq}`
        : r.seq !== undefined
          ? `seqt${SEP}${r.platform ?? ''}${SEP}${r.stepId}${SEP}${r.phase}${SEP}${
              r.eventId
            }${SEP}${r.branchId ?? ''}${SEP}${r.elapsedMs}${SEP}${r.timestamp}${SEP}${r.seq}`
          : `tuple${SEP}${r.platform ?? ''}${SEP}${r.stepId}${SEP}${r.phase}${SEP}${
              r.eventId
            }${SEP}${r.branchId ?? ''}${SEP}${r.elapsedMs}`;
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

/**
 * Read `outEvent.event.id` off a push result without loosening the type. Only
 * the push-result shape is walked; a bare outbound event (what a transformer
 * records) is deliberately not read, because a source-replacing transformer's
 * out event is a different event from the one the record describes.
 */
function outEventId(outEvent: unknown): string | undefined {
  if (typeof outEvent !== 'object' || outEvent === null) return undefined;
  if (!('event' in outEvent)) return undefined;
  const event = outEvent.event;
  if (typeof event !== 'object' || event === null) return undefined;
  if (!('id' in event)) return undefined;
  const id = event.id;
  return typeof id === 'string' && id !== '' ? id : undefined;
}

/**
 * The event a record belongs to, or undefined when it names none.
 *
 * A stamped `eventId` always wins. Only an anonymous record falls back to the
 * push result it carries: that is the compat path for runtimes predating the
 * early span-id mint, whose whole `collector.push` hop is anonymous. The
 * fallback fills an absent id and never overrides a present one, because a
 * fan-out's result reports its first child while the record itself belongs to
 * the wrap; overriding would move the record into another event's journey.
 */
function resolveEventId(record: FlowState): string | undefined {
  if (record.eventId !== '') return record.eventId;
  return outEventId(record.outEvent);
}

/**
 * Union-find over event ids: the smallest id in a set is its representative, so
 * the resulting partition is independent of merge order and a `parentEventId`
 * cycle cannot make the walk diverge.
 */
function findSet(parents: Map<string, string>, id: string): string {
  let root = id;
  for (;;) {
    const next = parents.get(root);
    if (next === undefined || next === root) break;
    root = next;
  }
  let cur = id;
  while (cur !== root) {
    const next = parents.get(cur);
    parents.set(cur, root);
    if (next === undefined) break;
    cur = next;
  }
  return root;
}

/** Merge two event ids into one set. */
function uniteSets(parents: Map<string, string>, a: string, b: string): void {
  const rootA = findSet(parents, a);
  const rootB = findSet(parents, b);
  if (rootA === rootB) return;
  if (rootA < rootB) parents.set(rootB, rootA);
  else parents.set(rootA, rootB);
}

/**
 * The originating event of a merged set: the member whose parent lies outside
 * the set (or that has none). Every member is backed by records, so the result
 * always names an event the journey contains. A `parentEventId` cycle leaves no
 * such member; the smallest id then breaks the tie, keeping the choice total.
 */
function pickOrigin(
  eventIds: Set<string>,
  parentsOf: Map<string, Set<string>>,
): string {
  const members = [...eventIds].sort();
  for (const member of members) {
    const parents = parentsOf.get(member);
    if (parents === undefined) return member;
    let linked = false;
    for (const parent of parents) {
      if (eventIds.has(parent)) {
        linked = true;
        break;
      }
    }
    if (!linked) return member;
  }
  return members[0];
}

/** First truthy `traceId` in record order, when any record carries one. */
function firstTraceId(records: FlowState[]): string | undefined {
  for (const record of records) if (record.traceId) return record.traceId;
  return undefined;
}

/**
 * Summarize the records that named no event, per platform. Only records
 * carrying a `traceId` count: they belonged to a real event run and should have
 * been attributable. Destination `init` and store lifecycle frames stamp no
 * traceId, so they fall out without enumerating phases, and the figure stays a
 * signal rather than a permanent nonzero background.
 */
function summarizeUnattributed(records: FlowState[]): JourneyUnattributed[] {
  interface Bucket {
    platform?: JourneyPlatform;
    count: number;
    fromMs: number;
    toMs: number;
    stepIds: Set<string>;
  }
  const byPlatform = new Map<string, Bucket>();

  for (const record of records) {
    if (!record.traceId) continue;
    const key = record.platform ?? NO_PLATFORM;
    const ms = toEpoch(record.timestamp);
    let bucket = byPlatform.get(key);
    if (bucket === undefined) {
      bucket = {
        ...(record.platform !== undefined ? { platform: record.platform } : {}),
        count: 0,
        fromMs: ms,
        toMs: ms,
        stepIds: new Set<string>(),
      };
      byPlatform.set(key, bucket);
    }
    bucket.count += 1;
    if (ms < bucket.fromMs) bucket.fromMs = ms;
    if (ms > bucket.toMs) bucket.toMs = ms;
    bucket.stepIds.add(record.stepId);
  }

  return [...byPlatform.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, bucket]) => ({
      ...(bucket.platform !== undefined ? { platform: bucket.platform } : {}),
      count: bucket.count,
      fromMs: bucket.fromMs,
      toMs: bucket.toMs,
      stepIds: [...bucket.stepIds].sort(),
    }));
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
 * harvest because a flush confirms a batch rather than doing this hop's work:
 * it must not become the hop's terminal phase, and its `batch` describes the
 * flush rather than this hop's enqueue. They still fold in as batch
 * confirmation and still count toward `startedAtMs` (port parity).
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
  let release: string | undefined;

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
    if (r.release !== undefined) release = r.release;
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
    ...(release !== undefined ? { release } : {}),
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

/**
 * Assemble one event group (already sorted) into a Journey. `entryPool` scopes
 * `pickEntry` to the originating arm: with two arms on two machines, clock skew
 * could otherwise pick the far arm's collector-in as the entry.
 */
function assembleJourney(
  id: string,
  traceId: string | undefined,
  records: FlowState[],
  entryPool: FlowState[],
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
    correlation: 'event',
    ...(traceId !== undefined ? { traceId } : {}),
    entry: pickEntry(entryPool),
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
 * Pure assembly of raw `FlowState` records into cross-runtime journeys, one per
 * EVENT. Records group by their `eventId`; a `traceId` is run-scoped and covers
 * every event of a page load or container run, so it is carried as the run
 * handle rather than used to group. Records naming no event are excluded from
 * grouping and reported in `unattributed` when they carried a run trace.
 *
 * The function is idempotent (duplicate records are deduped first) and
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

  // Gaps are detected over all records (flush frames carry `seq` too, so keep
  // them here to preserve the poster's monotonic run) before any grouping.
  ctx.gaps = detectGaps(deduped);

  // Resolve every record to its event. A record that names none joins no
  // journey: attaching it would take an ordering or adjacency heuristic, and a
  // record in the wrong journey is worse than one reported as unattributed. An
  // adopted record continues as a copy carrying the resolved id, so every
  // downstream reduction sees one coherent identity and none of them need to
  // know adoption happened. The copy never mutates the caller's record.
  interface Attributed {
    record: FlowState;
    eventId: string;
  }
  const attributed: Attributed[] = [];
  const unresolved: FlowState[] = [];
  for (const record of deduped) {
    const eventId = resolveEventId(record);
    if (eventId === undefined) {
      unresolved.push(record);
      continue;
    }
    attributed.push({
      record: eventId === record.eventId ? record : { ...record, eventId },
      eventId,
    });
  }
  attributed.sort((a, b) => compareRecords(a.record, b.record));
  const known = new Set(attributed.map((a) => a.eventId));

  // Join $flow crossing continuations. INVARIANT: `parentEventId` records ONE
  // relation, the traceparent parent-span of the request an event arrived in
  // (collector `source.ts` stamps it from `ingest._meta` alone), so merging on
  // it merges a single logical event across a runtime boundary. It must never
  // carry a sibling relation: collector fan-outs never stamp it, and when one
  // inbound request decodes into several events they share one parent, which is
  // a fan-out and not a continuation. Merging those would put several events'
  // records under one `(platform, stepId)` hop and last-wins their payloads,
  // which is the folding the event grain exists to remove. So a parent merges
  // only with a single child; N children stay N journeys, still linked by the
  // `parentEventId` their hops carry. Merging is therefore non-local: a second
  // child arriving later splits a previously merged pair on the next assembly.
  // Each output is correct for the records seen, and the parent keeps its id
  // across the split.
  const parentsOf = new Map<string, Set<string>>();
  const childrenOf = new Map<string, Set<string>>();
  for (const { record, eventId } of attributed) {
    const parent = record.parentEventId;
    // A parent naming no observed event has nothing to merge with; a
    // self-reference is not a relation.
    if (parent === undefined || parent === eventId || !known.has(parent))
      continue;
    const parents = parentsOf.get(eventId);
    if (parents) parents.add(parent);
    else parentsOf.set(eventId, new Set([parent]));
    const children = childrenOf.get(parent);
    if (children) children.add(eventId);
    else childrenOf.set(parent, new Set([eventId]));
  }

  const merged = new Map<string, string>();
  for (const [parent, children] of childrenOf) {
    if (children.size !== 1) continue;
    for (const child of children) uniteSets(merged, child, parent);
  }

  // One journey per set; a set of one is the ordinary single-event journey.
  interface EventGroup {
    entries: Attributed[];
    eventIds: Set<string>;
  }
  const groups = new Map<string, EventGroup>();
  for (const entry of attributed) {
    const key = findSet(merged, entry.eventId);
    let group = groups.get(key);
    if (!group) {
      group = { entries: [], eventIds: new Set<string>() };
      groups.set(key, group);
    }
    group.entries.push(entry);
    group.eventIds.add(entry.eventId);
  }

  const journeys = [...groups.values()].map((group) => {
    const origin = pickOrigin(group.eventIds, parentsOf);
    const groupRecords = group.entries.map((e) => e.record);
    const originRecords = group.entries
      .filter((e) => e.eventId === origin)
      .map((e) => e.record);
    // The run handle is the originating arm's trace; a crossing's far arm runs
    // its own. An old emitter can leave the origin arm trace-less, so the
    // group's first trace stands in rather than dropping the handle entirely.
    const traceId = firstTraceId(originRecords) ?? firstTraceId(groupRecords);
    return assembleJourney(origin, traceId, groupRecords, originRecords, ctx);
  });

  journeys.sort((a, b) => {
    if (a.firstTimestamp !== b.firstTimestamp)
      return a.firstTimestamp - b.firstTimestamp;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const unattributed = summarizeUnattributed(unresolved);

  return {
    journeys,
    gaps: ctx.gaps,
    ...(unattributed.length > 0 ? { unattributed } : {}),
  };
}
