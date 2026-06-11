import type { WalkerOS } from '.';

/**
 * A recorded function call made during simulation.
 * Captures what a destination called on its env (e.g., window.gtag).
 */
export interface Call {
  /** Dot-path of the function called: "window.gtag", "dataLayer.push" */
  fn: string;
  /** Arguments passed to the function */
  args: unknown[];
  /** Unix timestamp in ms */
  ts: number;
}

/**
 * Result of simulating a single step.
 * Same shape for source, transformer, collector, and destination.
 */
export interface Result {
  /** Which step type was simulated */
  step: 'source' | 'transformer' | 'destination' | 'collector';
  /** Step name, e.g. "gtag", "dataLayer", "enricher" */
  name: string;
  /**
   * Output events:
   * - source: captured pre-collector events
   * - transformer: [transformed event] or [] if filtered
   * - collector: [enriched event] (createEvent applied)
   * - destination: [] (destinations don't produce events)
   */
  events: WalkerOS.DeepPartialEvent[];
  /** Intercepted env calls. Populated for destinations, empty [] for others. */
  calls: Call[];
  /** Execution time in ms */
  duration: number;
  /**
   * Entity-action key of the matched mapping rule, e.g. "product add" or
   * "product *". Populated for destination simulations when a mapping rule
   * matched; absent when no rule matched or the step has no mapping.
   * Also absent when the matched rule uses batched delivery (batching
   * reports no per-event key) and on error results, where the key is not
   * available.
   */
  mappingKey?: string;
  /** Error if the step threw */
  error?: Error;
}
