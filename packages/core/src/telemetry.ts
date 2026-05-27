import type { FlowState } from './types/telemetry';
import type { ObserverFn } from './types/observer';

/**
 * Telemetry level. Off disables emission entirely. Standard projects
 * structural state without inEvent or outEvent payloads (unless explicitly
 * opted in). Trace emits full payloads on every hop.
 */
export type TelemetryLevel = 'off' | 'standard' | 'trace';

/**
 * Options that shape the telemetry projection strategy. Defaults are chosen
 * so a caller can pass `{ flowId }` and get sensible behavior.
 */
export interface TelemetryOptions {
  /** Required flow identifier; observers may use this for cross-flow correlation. */
  flowId: string;
  /** Verbosity. Defaults to 'standard'. */
  level?: TelemetryLevel;
  /** Force-include the inbound event regardless of level. */
  includeIn?: boolean;
  /** Force-include the outbound event regardless of level. */
  includeOut?: boolean;
  /** Force-include the matched mapping key (only meaningful for transformers/destinations). */
  includeMappingKey?: boolean;
  /**
   * Fraction of events to emit, between 0 and 1. Deterministic by eventId:
   * the same eventId always falls on the same side of the threshold so
   * paired in/out states either both emit or both drop.
   */
  sample?: number;
}

export type EmitFn = (state: FlowState) => void;

/**
 * Optional supplier form. When passed instead of static `TelemetryOptions`,
 * the observer evaluates the supplier on every emit so toggle-style runtime
 * overrides (e.g. `WALKEROS_TRACE_UNTIL`) reach the projection without
 * rebuilding the observer.
 */
export type TelemetryOptionsSupplier = () => TelemetryOptions | null;

/**
 * Deterministic 32-bit FNV-1a hash of a string. Used for sampling so
 * identical eventIds always map to the same numeric bucket.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash =
      (hash +
        ((hash << 1) +
          (hash << 4) +
          (hash << 7) +
          (hash << 8) +
          (hash << 24))) >>>
      0;
  }
  return hash >>> 0;
}

/**
 * Returns true when the eventId passes the sample gate. Sample of 1 always
 * passes; sample of 0 always fails. Anything in between buckets the eventId
 * deterministically so the in/out pair is consistent.
 */
function passesSample(eventId: string, sample: number): boolean {
  if (sample >= 1) return true;
  if (sample <= 0) return false;
  const hashed = fnv1a(eventId);
  const ratio = hashed / 0xffffffff;
  return ratio < sample;
}

/**
 * Build a telemetry observer that projects FlowState records according to
 * level/sample/include flags and forwards them to `emit`. The observer is
 * synchronous, never throws (a throwing emit is swallowed), and does no
 * IO of its own. Designed to be added to `collector.observers` so the
 * runtime self-emission loop drives it.
 *
 * Accepts either a static `TelemetryOptions` value or a supplier
 * `() => TelemetryOptions | null`. With a supplier, every emit reads the
 * current opts so toggles such as `WALKEROS_TRACE_UNTIL` reach the
 * projection without rebuilding the observer. A supplier returning `null`
 * suppresses the emit (telemetry off).
 */
export function createTelemetryObserver(
  emit: EmitFn,
  optsOrSupplier: TelemetryOptions | TelemetryOptionsSupplier,
): ObserverFn {
  const supply: TelemetryOptionsSupplier =
    typeof optsOrSupplier === 'function'
      ? optsOrSupplier
      : () => optsOrSupplier;

  return function project(state: FlowState): void {
    const opts = supply();
    if (!opts) return;

    const level: TelemetryLevel = opts.level ?? 'standard';
    if (level === 'off') return;

    const rawSample = opts.sample;
    const sample =
      typeof rawSample === 'number' && Number.isFinite(rawSample)
        ? rawSample
        : 1;
    if (state.eventId && !passesSample(state.eventId, sample)) return;

    const includeIn = opts.includeIn ?? level === 'trace';
    const includeOut = opts.includeOut ?? level === 'trace';
    const includeMappingKey = opts.includeMappingKey ?? level === 'trace';

    const projected: FlowState = { ...state };
    if (!includeIn) delete projected.inEvent;
    if (!includeOut) delete projected.outEvent;
    if (!includeMappingKey) delete projected.mappingKey;

    // Error message truncation: limit to 256 chars outside trace so stack
    // fragments or echoed payloads do not leak verbosely. Trace keeps the
    // full message.
    if (
      level !== 'trace' &&
      projected.error?.message &&
      projected.error.message.length > 256
    ) {
      projected.error = {
        ...projected.error,
        message: projected.error.message.slice(0, 256) + '…',
      };
    }

    try {
      emit(projected);
    } catch {
      // Downstream emit must not crash the pipeline. Logging would itself
      // be observer-shaped, so swallow defensively.
    }
  };
}

/**
 * Convenience export: the internal sampling predicate so callers (and
 * tests) can verify the deterministic bucketing without importing the
 * private FNV-1a helper.
 */
export function isSampled(eventId: string, sample: number): boolean {
  return passesSample(eventId, sample);
}
