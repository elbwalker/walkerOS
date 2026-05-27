import type { Collector } from './types';
import type { FlowState } from './types/telemetry';

/**
 * Synchronously fans out a FlowState record to every registered observer
 * on the collector. Each call is wrapped in try/catch so a misbehaving
 * observer cannot crash the runtime; observers are advisory and must not
 * affect pipeline outcomes.
 *
 * Iterates a snapshot of the observer set so an observer adding or removing
 * another observer during the emit does not re-enter or skip in the same
 * pass. The early return on an empty set keeps the zero-observer hot path
 * allocation-free.
 */
export function emitStep(
  collector: Collector.Instance,
  state: FlowState,
): void {
  if (collector.observers.size === 0) return;
  const snapshot = Array.from(collector.observers);
  for (const observer of snapshot) {
    try {
      observer(state);
    } catch {
      // Observers must never crash the pipeline.
    }
  }
}
