/**
 * FlowState is the canonical observation record emitted at each hop in a
 * walkerOS pipeline. Telemetry helpers populate one of these per (step,
 * phase) tuple and pass it to a user-supplied emit callback. The shape is
 * stable across step kinds (source, transformer, collector, destination,
 * store) so a single observer can correlate work across the pipeline.
 *
 * Optional fields are populated only when meaningful for the (step, phase)
 * pair, or when the telemetry options explicitly opt in (e.g. trace level
 * for inEvent/outEvent).
 */

export type FlowStatePhase = 'init' | 'in' | 'out' | 'error' | 'skip' | 'flush';

export type FlowStepType =
  | 'source'
  | 'transformer'
  | 'collector'
  | 'destination'
  | 'store';

export interface FlowStateBatch {
  size: number;
  index: number;
}

export interface FlowState {
  /** The flow this state belongs to. */
  flowId: string;
  /** Step identifier, e.g. 'destination.gtag', 'transformer.consent', 'collector.push'. */
  stepId: string;
  stepType: FlowStepType;
  phase: FlowStatePhase;
  /** W3C span-id of the originating WalkerOS.Event. Sourced from event.id; never synthesized. */
  eventId: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Milliseconds since the runtime's startedAt origin. Monotonic. */
  elapsedMs: number;
  /** Wall-clock duration of this step, if measured (typically only on 'out'). */
  durationMs?: number;
  /** Inbound walker event for this hop. Only populated when level === 'trace' or includeIn === true. */
  inEvent?: unknown;
  /** Outbound walker event/payload for this hop. Only populated when level === 'trace' or includeOut === true. */
  outEvent?: unknown;
  /** Error info when phase === 'error'. */
  error?: { name?: string; message: string };
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
  skipReason?: 'consent' | 'cache_hit' | 'sampled_out' | 'disabled' | 'unknown';
  /** Free-form metadata: store key/value, cached: true, etc. */
  meta?: Record<string, unknown>;
}
