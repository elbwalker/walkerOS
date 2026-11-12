import type { StepKind } from './collector';

/**
 * FlowState is the canonical observation record emitted at each hop in a
 * walkerOS pipeline. The runtime hands one of these per (step, phase) tuple to
 * every function in `collector.observers`. The shape is stable across step
 * kinds (source, transformer, collector, destination, store) so a single
 * observer can correlate work across the pipeline.
 *
 * Optional fields are populated only when meaningful for the (step, phase)
 * pair.
 */

export type FlowStatePhase = 'init' | 'in' | 'out' | 'error' | 'skip' | 'flush';

export type FlowStepType = StepKind;

export interface FlowStateBatch {
  size: number;
  index: number;
}

export interface FlowState {
  /** The flow this state belongs to. */
  flowId: string;
  /**
   * Runtime that produced this state: `web` (browser bundle) or `server`
   * (Node runtime). Mirrors the originating flow's `config.platform`.
   * Optional: emitters may omit it; populated when the runtime is known.
   */
  platform?: 'web' | 'server';
  /** Step identifier, e.g. 'destination.gtag', 'transformer.consent', 'collector.push'. */
  stepId: string;
  stepType: FlowStepType;
  phase: FlowStatePhase;
  /** W3C span-id of the originating WalkerOS.Event. Sourced from event.id; never synthesized. */
  eventId: string;
  /** W3C 32-hex trace id of the originating run. Sourced from event.source.trace; never synthesized here. */
  traceId?: string;
  /** Upstream runtime's event.id when this pipeline was entered via a $flow crossing (from traceparent). */
  parentEventId?: string;
  /** Originating source id (Ingest._meta.path[0]), when known. */
  sourceId?: string;
  /** Release provenance of the runtime that produced this state, e.g. a deployment id. */
  release?: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Milliseconds since the runtime's startedAt origin. Monotonic. */
  elapsedMs: number;
  /** Wall-clock duration of this step, if measured (typically only on 'out'). */
  durationMs?: number;
  /** Inbound walker event for this hop. Every `in` record of an event carries it. */
  inEvent?: unknown;
  /** Outbound walker event or payload for this hop. Every `out` record of an event carries it. */
  outEvent?: unknown;
  /**
   * Error info when phase === 'error'. A delivery failure also carries its
   * failure `code`, whether a retry can help and the HTTP `status`.
   */
  error?: {
    name?: string;
    message: string;
    code?: string;
    retryable?: boolean;
    status?: number;
  };
  /** The mapping rule that matched, when one matched. */
  mappingKey?: string;
  /** Contract rule that matched, if any. */
  contractRule?: string;
  /** Consent gate snapshot at hop time. */
  consent?: Record<string, boolean>;
  /** Consent state actually applied (after policy resolution). */
  consentApplied?: Record<string, boolean>;
  /** W3C 16-hex span-id of the child branch for `many` fan-out. */
  branchId?: string;
  /** For phase === 'flush', the batch size + entry index. */
  batch?: FlowStateBatch;
  /** Discriminator when phase === 'skip'. */
  skipReason?:
    | 'consent'
    | 'cache_hit'
    | 'disabled'
    | 'dropped'
    | 'ignored'
    | 'unknown';
  /** Free-form metadata: store key/value, cached: true, etc. */
  meta?: Record<string, unknown>;
}
