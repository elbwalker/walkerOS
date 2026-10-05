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
 * Build a `FlowState` carrying the always-populated fields. Callers fill in
 * additional fields (consent, batch, error, meta, inEvent, outEvent,
 * mappingKey, durationMs) as relevant for the step site.
 *
 * `flowId` is the collector's static flow `name`, falling back to `'default'`
 * when the flow is unnamed. The journey trio is stamped only when `journey`
 * carries a truthy value, so store and init records never carry it.
 */
export function stepState(
  collector: Collector.Instance,
  stepId: string,
  stepType: FlowState['stepType'],
  phase: FlowState['phase'],
  eventId: string,
  now = Date.now(),
  journey?: JourneyFields,
): FlowState {
  const state: FlowState = {
    flowId: collector.name ?? 'default',
    stepId,
    stepType,
    phase,
    eventId,
    timestamp: new Date(now).toISOString(),
    elapsedMs: now - collector.status.startedAt,
  };
  // An undefined trace/source/parent must not appear as an explicit key.
  if (journey?.traceId) state.traceId = journey.traceId;
  if (journey?.sourceId) state.sourceId = journey.sourceId;
  if (journey?.parentEventId) state.parentEventId = journey.parentEventId;
  return state;
}

/** Object-argument form of `stepState`. */
export function buildBaseState(
  collector: Collector.Instance,
  args: BuildBaseStateArgs,
): FlowState {
  return stepState(
    collector,
    args.stepId,
    args.stepType,
    args.phase,
    args.eventId,
    args.now,
    args,
  );
}

/**
 * The error a `FlowState` carries: name and message for an `Error`, the
 * message alone for anything else thrown.
 */
export function stepError(err: unknown): NonNullable<FlowState['error']> {
  return err instanceof Error
    ? { name: err.name, message: err.message }
    : { message: String(err) };
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

/**
 * Why a collector-owned position dropped an event.
 * - `dropped`: a chain hop or a route `stop` (`source.before`, `source.next`,
 *   `collector.next`); `by` is the transformer id, `'route'` when omitted.
 * - `consent`: the source's `config.consent` is not granted; `required` is
 *   that requirement and `consent` the state it was checked against.
 */
export type CollectorDrop =
  | { reason: 'dropped'; at: string; by?: string }
  | {
      reason: 'consent';
      at: string;
      required: WalkerOS.Consent;
      consent: WalkerOS.Consent;
    };

/**
 * A drop at a collector-owned position: the event never reaches the
 * destinations. Emits one `collector.push` `skip` (the same hop as the
 * wrap's in/out, which the skip outranks as the terminal phase) whose
 * `skipReason` is the drop's reason and whose `meta.at` names where it
 * happened. A chain drop names what dropped it (`meta.by`); a consent drop
 * carries the gate's record the way a destination consent skip does
 * (`meta.required` and the checked `consent`). The event counts as received
 * (`status.in`), with no `out` and no counter of its own.
 */
export function emitCollectorDrop(
  collector: Collector.Instance,
  event: WalkerOS.DeepPartialEvent,
  ingest: Ingest | undefined,
  drop: CollectorDrop,
): void {
  collector.status.in++;
  const state = stepState(
    collector,
    'collector.push',
    'collector',
    'skip',
    typeof event.id === 'string' ? event.id : '',
    Date.now(),
    journeyFields(event, ingest, collector),
  );
  state.skipReason = drop.reason;
  if (drop.reason === 'consent') {
    state.consent = { ...drop.consent };
    state.meta = { at: drop.at, required: { ...drop.required } };
  } else {
    state.meta = { by: drop.by ?? 'route', at: drop.at };
  }
  emitStep(collector, state);
}
