import type { Collector } from './types';
import type { FlowState } from './types/telemetry';

/**
 * Synchronously fans out a FlowState record to every registered observer
 * on the collector. Each call is wrapped in try/catch so a misbehaving
 * observer cannot crash the runtime; observers are advisory and must not
 * affect pipeline outcomes.
 */
export function emitStep(
  collector: Collector.Instance,
  state: FlowState,
): void {
  for (const observer of collector.observers) {
    try {
      observer(state);
    } catch {
      // Observers must never crash the pipeline.
    }
  }
}
