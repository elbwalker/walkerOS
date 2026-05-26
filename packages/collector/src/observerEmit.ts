import type { Collector, FlowState } from '@walkeros/core';
import { emitStep } from '@walkeros/core';

export interface BuildBaseStateArgs {
  stepId: string;
  stepType: FlowState['stepType'];
  phase: FlowState['phase'];
  eventId: string;
  now: number;
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
  return {
    flowId: 'default',
    stepId: args.stepId,
    stepType: args.stepType,
    phase: args.phase,
    eventId: args.eventId,
    timestamp: new Date(args.now).toISOString(),
    elapsedMs: args.now - startedAt,
  };
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
