import type { Collector, FlowState, Ingest, WalkerOS } from '@walkeros/core';
import { emitStep } from '@walkeros/core';

/** Journey-correlation trio shared by every FlowState-stamping site. */
export interface JourneyFields {
  traceId?: string;
  sourceId?: string;
  parentEventId?: string;
}

/**
 * Resolve the journey-correlation trio for a stamping site. Trace precedence:
 * a payload `event.source.trace` (origin identity) wins; a header-derived
 * `ingest._meta.trace` fills the gap; the run-scoped `collector.trace` is the
 * final fallback. `sourceId` and `parentEventId` come from the ingest context
 * threaded through the pipeline. The event accepts both a full event and a
 * DeepPartial incoming shape, since sites stamp at both pre- and
 * post-enrichment positions.
 */
export function journeyFields(
  event: WalkerOS.Event | WalkerOS.DeepPartialEvent,
  ingest: Ingest | undefined,
  collector: Collector.Instance,
): JourneyFields {
  return {
    // Must match createEvent's trace precedence (handle.ts).
    traceId: event.source?.trace ?? ingest?._meta.trace ?? collector.trace,
    sourceId: ingest?._meta.path[0],
    parentEventId: ingest?._meta.parentEventId,
  };
}

export interface BuildBaseStateArgs {
  stepId: string;
  stepType: FlowState['stepType'];
  phase: FlowState['phase'];
  eventId: string;
  now: number;
  /** W3C 32-hex trace id of the originating run (from event.source.trace). */
  traceId?: string;
  /** Originating source id (Ingest._meta.path[0]), when known. */
  sourceId?: string;
  /** Upstream runtime's event.id from an inbound $flow crossing. */
  parentEventId?: string;
}

/**
 * Build a `FlowState` carrying the six always-populated fields. Callers
 * fill in additional fields (consent, batch, error, meta, inEvent,
 * outEvent, mappingKey, durationMs) as relevant for the step site.
 *
 * `flowId` defaults to a literal `'default'` until flow-id wiring is
 * threaded through the collector instance. Treat as a forward-compatible
 * placeholder, not a final shape.
 */
export function buildBaseState(
  collector: Collector.Instance,
  args: BuildBaseStateArgs,
): FlowState {
  const startedAt = collector.status.startedAt;
  const state: FlowState = {
    flowId: 'default',
    stepId: args.stepId,
    stepType: args.stepType,
    phase: args.phase,
    eventId: args.eventId,
    timestamp: new Date(args.now).toISOString(),
    elapsedMs: args.now - startedAt,
  };
  // Stamp journey-correlation fields only when a truthy value is in scope;
  // an undefined trace/source/parent must not appear as an explicit key.
  if (args.traceId) state.traceId = args.traceId;
  if (args.sourceId) state.sourceId = args.sourceId;
  if (args.parentEventId) state.parentEventId = args.parentEventId;
  return state;
}

/**
 * Convenience wrapper: build the base state and fan out to observers in
 * one call. Returns no value; callers that need to add trailing fields
 * before observers see them should call `buildBaseState` + `emitStep`
 * directly instead.
 */
export function emit(
  collector: Collector.Instance,
  args: BuildBaseStateArgs,
): void {
  emitStep(collector, buildBaseState(collector, args));
}
