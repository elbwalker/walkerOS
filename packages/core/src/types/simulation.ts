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
 * Same shape for source, transformer, and destination.
 */
export interface Result {
  /** Which step type was simulated */
  step: 'source' | 'transformer' | 'destination';
  /** Step name, e.g. "gtag", "dataLayer", "enricher" */
  name: string;
  /**
   * Output events:
   * - source: captured pre-collector events
   * - transformer: [transformed event] or [] if filtered
   * - destination: [] (destinations don't produce events)
   */
  events: WalkerOS.DeepPartialEvent[];
  /** Intercepted env calls. Populated for destinations, empty [] for others. */
  calls: Call[];
  /** Execution time in ms */
  duration: number;
  /** Error if the step threw */
  error?: Error;
}
