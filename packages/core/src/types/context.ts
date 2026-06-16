import type { Collector, Logger, WalkerOS } from '.';

/**
 * Base context interface for walkerOS stages.
 * Sources, Transformers, and Destinations extend this.
 */
export interface Base<C = unknown, E = unknown> {
  collector: Collector.Instance;
  logger: Logger.Instance;
  config: C;
  env: E;
  /**
   * Out-of-band error seam available to every step kind (source,
   * transformer, store, destination). A step that owns an EventEmitter SDK
   * object (BigQuery `StreamConnection`, a Redis client, a Kafka producer)
   * calls this from the object's `'error'` handler, where there is no
   * surrounding `await`/`tryCatchAsync` to catch into and an unhandled
   * `'error'` would otherwise crash the process on a detached tick.
   *
   * MUST NOT throw (it runs on a detached emitter tick; a throw inside it
   * would reintroduce the uncaughtException it exists to prevent).
   *
   * - With `event`: routes that event through the same per-step failure
   *   accounting an in-band push failure uses (the destination DLQ + the
   *   `failed` counters), so a connection error that loses a specific event
   *   is counted and surfaced exactly like a synchronous push failure.
   * - Without `event` (an orphan / connection-level error, e.g. a stream
   *   writer that errored between pushes): a contained `logger.error` plus a
   *   bump of `Status.connectionErrors[stepId]`. It does NOT bump
   *   `Status.failed` (no event was lost at this instant; the next push that
   *   hits the broken writer is what gets DLQ'd and counted as failed, so
   *   counting the orphan against `failed` would double-count).
   */
  reportError?(err: unknown, event?: WalkerOS.Event): void;
}
