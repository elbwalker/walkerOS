// packages/core/src/types/lifecycle.ts
import type { Logger, WalkerOS } from '.';

/**
 * Context provided to the destroy() lifecycle method.
 *
 * A subset of the init context — config, env, logger, and id.
 * Does NOT include collector or event data. Destroy should only
 * clean up resources, not interact with the event pipeline.
 */
export interface DestroyContext<C = unknown, E = unknown> {
  /** Step instance ID. */
  id: string;
  /** Step configuration (contains settings with SDK clients, etc.). */
  config: C;
  /** Runtime environment/dependencies (DB clients, auth clients, etc.). */
  env: E;
  /** Scoped logger for this step instance. */
  logger: Logger.Instance;
}

/**
 * Destroy function signature for step lifecycle cleanup.
 *
 * Implementations should be idempotent — calling destroy() twice must not throw.
 * Used for closing connections, clearing timers, releasing SDK clients.
 */
export type DestroyFn<C = unknown, E = unknown> = (
  context: DestroyContext<C, E>,
) => WalkerOS.PromiseOrValue<void>;
