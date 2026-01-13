import type { Collector, Logger } from '.';

/**
 * Base context interface for walkerOS stages.
 * Sources, Processors, and Destinations extend this.
 */
export interface Base<C = unknown, E = unknown> {
  collector: Collector.Instance;
  logger: Logger.Instance;
  config: C;
  env: E;
}
