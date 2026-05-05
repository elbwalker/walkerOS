// packages/core/src/types/lifecycle.ts
import type { Logger, WalkerOS } from '.';

/**
 * Shared context for one-shot lifecycle hooks (setup, destroy).
 * No event pipeline machinery — just config, env, logger, and id.
 */
export interface LifecycleContext<C = unknown, E = unknown> {
  id: string;
  config: C;
  env: E;
  logger: Logger.Instance;
}

/**
 * Setup function signature. Called once via `walker setup <kind>.<name>`.
 * Packages own idempotency and error semantics. Return value (if any) is
 * JSON-stringified to stdout by the CLI for scripting use.
 */
export type SetupFn<C = unknown, E = unknown> = (
  context: LifecycleContext<C, E>,
) => Promise<unknown>;

/**
 * Destroy function signature for step lifecycle cleanup.
 */
export type DestroyFn<C = unknown, E = unknown> = (
  context: LifecycleContext<C, E>,
) => WalkerOS.PromiseOrValue<void>;

/**
 * @deprecated Use `LifecycleContext` instead. Kept as alias for one minor cycle.
 */
export type DestroyContext<C = unknown, E = unknown> = LifecycleContext<C, E>;
