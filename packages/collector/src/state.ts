import type { Collector, Ingest, State, WalkerOS } from '@walkeros/core';
import { applyState, compileState } from '@walkeros/core';
import { getStateStore } from './cache';

/**
 * Declarative step `state` behind the `__WALKEROS_STATE__` build flag (see
 * @walkeros/core build-flags). Only these helpers read the flag, so a bundle
 * built with it defined false folds the state engine out of every step.
 */

/** A step's state entries; undefined without any, or when the build has no state. */
export function compileStepState(
  state: State | State[] | undefined,
): State[] | undefined {
  return (typeof __WALKEROS_STATE__ === 'undefined' || __WALKEROS_STATE__) &&
    state
    ? compileState(state)
    : undefined;
}

/** Apply compiled state entries to an event, reading stores off the collector. */
export function runStepState<E extends WalkerOS.DeepPartialEvent>(
  collector: Collector.Instance,
  entries: State[],
  event: E,
  ingest: Ingest | undefined,
): Promise<E> {
  return typeof __WALKEROS_STATE__ === 'undefined' || __WALKEROS_STATE__
    ? applyState(
        entries,
        (id) => getStateStore(id, collector),
        event,
        collector,
        ingest,
      )
    : Promise.resolve(event);
}

/**
 * A build without state ignores a step's `state` (e.g. on a destination
 * added at runtime): warned, never silent. Stays in that lean bundle.
 */
export function warnStateOff(
  collector: Collector.Instance,
  step: string,
  state: unknown,
): void {
  if (
    !(typeof __WALKEROS_STATE__ === 'undefined' || __WALKEROS_STATE__) &&
    state !== undefined
  )
    collector.logger.warn(`state: not in this build, ${step} state ignored`);
}
