import type { Simulation } from '.';
import type { FlowStatePhase, FlowStepType } from './telemetry';

/**
 * Journey types describe the assembled, cross-runtime life of one traced event
 * as reconstructed from raw `FlowState` records by `assembleJourneys`. The
 * assembler is pure and presentation-free: no session scoping, no display copy,
 * no formatting. Presenters map a `Journey` into their own view shapes.
 *
 * Optional fields are populated only when the underlying records carry the
 * corresponding data (e.g. trace-level payloads, consent snapshots, vendor
 * calls); an absent field means the records never supplied it.
 */

/** Runtime that produced a hop: the non-empty subset of `FlowState.platform`. */
export type JourneyPlatform = 'web' | 'server';

/**
 * How a journey's records were correlated into one journey. `trace` groups by
 * the shared `traceId`; `legacy` is the fallback for records that predate trace
 * propagation and are grouped by their `eventId` alone.
 */
export type JourneyCorrelation = 'trace' | 'legacy';

/**
 * Collapsed outcome of a single hop, derived from its terminal phase. `pending`
 * covers a hop still in `in`/`init`/`flush` (no terminal phase observed yet);
 * `done` an `out`; `skipped` a `skip`; `error` an `error`.
 */
export type JourneyHopStatus = 'pending' | 'done' | 'skipped' | 'error';

/**
 * Completeness of a whole journey. `pending` while the journey may still gain
 * hops; `complete` when every expected hop reached a terminal phase; `partial`
 * when expected hops are missing after settling. Completeness resolution is
 * orthogonal to `lossy`.
 */
export type JourneyStatus = 'pending' | 'complete' | 'partial';

/**
 * Static shape of the pipeline the journey ran through, in topological order.
 * Core declares the type only; derivation lives in a shared presenter-side
 * helper. When supplied to `assembleJourneys`, node index is the within-segment
 * ordering rank. Hops match a node on `(platform, stepId)`, falling back to a
 * platform-less node with that stepId, then to the unique stepId match.
 */
export interface JourneyTopologyNode {
  /** Step identifier this node ranks, e.g. 'destination.gtag'. */
  stepId: string;
  /** Runtime the node belongs to, when known. */
  platform?: JourneyPlatform;
  /**
   * stepIds reachable directly downstream of this node. Each entry resolves to
   * the node with that stepId AND the same platform as this (source) node; if
   * none, to the unique node with that stepId regardless of platform (the
   * $flow crossing case, where stepIds differ across the crossing); if still
   * ambiguous, the edge is ignored.
   */
  downstream: string[];
}

/**
 * Topology graph in topological order; a node's index is its rank. Roots
 * (nodes no edge targets) only bind journeys that touch their platform, so
 * disjoint per-platform sub-graphs are safe: prefer crossing edges when
 * encodable (they thread expectations below done crossing hops); disjoint
 * platform sub-graphs are acceptable otherwise.
 */
export interface JourneyTopology {
  /** Nodes in topological order. */
  nodes: JourneyTopologyNode[];
}

/** Options controlling assembly. All optional; sensible defaults apply. */
export interface AssembleJourneysOptions {
  /** Pipeline topology used to rank hops within a platform segment. */
  topology?: JourneyTopology;
  /**
   * Milliseconds a journey stays eligible to change after its last record
   * before completeness is finalized. Defaults to 15000.
   */
  settleMs?: number;
  /** Wall-clock reference (epoch ms) for settle evaluation. Defaults to now. */
  now?: number;
}

/** The originating event of a journey, taken from its entry collector hop. */
export interface JourneyEntry {
  /** Originating event's id (W3C span-id). */
  eventId: string;
  /** Event name (e.g. 'page view'), when the entry record carried the inbound event. */
  name?: string;
  /** ISO 8601 wall-clock timestamp of the entry record. */
  timestamp: string;
  /** Originating source id, when known. */
  sourceId?: string;
  /** Runtime the entry occurred on, when known. */
  platform?: JourneyPlatform;
}

/**
 * A `many` fan-out child folded under its parent destination hop. Each branch
 * collapses the records carrying its `branchId` by terminal-phase precedence;
 * the parent hop's own outcome comes from its non-branch records only, so a
 * failing branch never poisons the parent status.
 */
export interface JourneyBranch {
  /** W3C span-id of the child branch. */
  branchId: string;
  /** Collapsed outcome of the branch. */
  status: JourneyHopStatus;
  /** Terminal phase the branch reached. */
  terminalPhase: FlowStatePhase;
  /** Wall-clock duration of the branch, when measured. */
  durationMs?: number;
  /** Skip discriminator when the branch was skipped. */
  skipReason?: 'consent' | 'cache_hit' | 'sampled_out' | 'disabled' | 'unknown';
  /** Error info when the branch failed. */
  error?: { name?: string; message: string };
  /** Outbound payload of the branch, when captured. */
  out?: unknown;
  /** Vendor calls recorded on the branch's out record, when captured. */
  calls?: Simulation.Call[];
}

/**
 * One collapsed step of a journey: all `FlowState` records for a
 * `(platform, stepId)` pair reduced to a single row by terminal-phase
 * precedence.
 */
export interface JourneyHop {
  /** Step identifier, e.g. 'destination.gtag'. */
  stepId: string;
  /** Kind of step this hop ran. */
  stepType: FlowStepType;
  /** Runtime that produced the hop, when known. Disambiguates same-named steps across sub-flows. */
  platform?: JourneyPlatform;
  /** Event id the hop's records belong to (per platform segment). */
  eventId: string;
  /** Upstream runtime's event id when this segment was entered via a $flow crossing. */
  parentEventId?: string;
  /** Collapsed outcome derived from `terminalPhase`. */
  status: JourneyHopStatus;
  /** Highest-precedence phase observed for the hop (error > skip > out > in > init > flush). */
  terminalPhase: FlowStatePhase;
  /** Earliest `elapsedMs` seen for the hop. Per-runtime; never compared across platforms. */
  startedAtMs: number;
  /** ISO 8601 wall-clock timestamp of the hop's earliest record. */
  timestamp: string;
  /** Wall-clock duration of the hop, when measured (typically from the out record). */
  durationMs?: number;
  /** Inbound event for the hop, when captured (trace level). */
  in?: unknown;
  /** Outbound event/payload for the hop, when captured (trace level). */
  out?: unknown;
  /** Error info when the hop's terminal phase is error. */
  error?: { name?: string; message: string };
  /** Skip discriminator when the hop's terminal phase is skip. */
  skipReason?: 'consent' | 'cache_hit' | 'sampled_out' | 'disabled' | 'unknown';
  /** Matched mapping rule, when one matched. */
  mappingKey?: string;
  /** Matched contract rule, when one matched. */
  contractRule?: string;
  /** Consent gate snapshot at hop time, when present. */
  consent?: Record<string, boolean>;
  /** Consent actually applied after policy resolution, when present. */
  consentApplied?: Record<string, boolean>;
  /** Vendor calls recorded on the hop's out record, when captured. */
  calls?: Simulation.Call[];
  /** Fan-out children when the hop produced `many` branches. */
  branches?: JourneyBranch[];
  /** True when the hop's terminal out record was part of a batched enqueue. */
  batched?: boolean;
  /**
   * True when a `flush` frame for this batched hop folded in, confirming the
   * batch was actually flushed to the vendor. Set only on batched hops; a
   * pre-wire flush-only frame (no batched out record) leaves the hop
   * non-terminal and is not a confirmation.
   */
  flushConfirmed?: boolean;
  /** Free-form metadata carried by the hop's records. */
  meta?: Record<string, unknown>;
}

/**
 * A wall-clock-bounded window on one platform's poster where the monotonic
 * `seq` counter skipped, indicating dropped records. Gaps are per-platform
 * because `seq` is stamped per poster. Detected by walking each platform's
 * records in wall-clock order: a forward `seq` jump of more than one is a gap
 * (bounds come from the adjacent records); a backward jump is a poster restart
 * (new generation, e.g. a page reload), never a loss.
 */
export interface JourneyGap {
  /** Poster runtime the gap was detected on. */
  platform?: JourneyPlatform;
  /** Wall-clock lower bound of the missing window (epoch ms). */
  fromMs: number;
  /** Wall-clock upper bound of the missing window (epoch ms). */
  toMs: number;
  /** Last `seq` observed before the gap. */
  afterSeq: number;
  /** First `seq` observed after the gap. */
  beforeSeq: number;
}

/** One reconstructed event lifetime across the pipeline. */
export interface Journey {
  /** `traceId` when trace-correlated, else `event:<eventId>`. */
  id: string;
  /** How the journey's records were correlated. */
  correlation: JourneyCorrelation;
  /** Shared trace id, when trace-correlated. */
  traceId?: string;
  /** Originating event of the journey. */
  entry: JourneyEntry;
  /** Collapsed hops in platform-segment then within-segment order. */
  hops: JourneyHop[];
  /** Distinct platforms present, in segment order. */
  platforms: JourneyPlatform[];
  /** Completeness of the journey. */
  status: JourneyStatus;
  /** True when the journey's window overlaps a detected `seq` gap. */
  lossy: boolean;
  /** Earliest record wall-clock timestamp (epoch ms). */
  firstTimestamp: number;
  /** Latest record wall-clock timestamp (epoch ms). */
  lastTimestamp: number;
  /** Approximate cross-runtime span (`lastTimestamp - firstTimestamp`), in ms. */
  totalMs: number;
}

/**
 * Result of assembling a set of `FlowState` records. `journeys` are returned in
 * first-seen wall-clock ascending order (oldest first); presenters that list
 * newest-first sort as needed. `gaps` are session-level, per-platform loss
 * windows shared across the journeys.
 */
export interface JourneyAssembly {
  /** Assembled journeys, oldest first by `firstTimestamp`. */
  journeys: Journey[];
  /** Session-level per-platform loss windows. */
  gaps: JourneyGap[];
}
