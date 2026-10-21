import { setCause } from './errorCause';

/**
 * Error subclass for invariant violations or operator-initiated aborts
 * that must escape the top-level boundary catches in `collector.push`
 * and `collector.command`.
 *
 * Standard `Error` instances are absorbed by the boundary, logged, and
 * counted on `collector.status.failed`. A `FatalError` rethrows so a
 * runtime supervisor (CLI runner, Express server, container orchestrator)
 * can terminate the process cleanly.
 *
 * Use sparingly. Most operational failures are recoverable and should
 * be plain `Error`. Reserve `FatalError` for programmer-error invariant
 * violations or explicit fail-stop signals.
 */
export class FatalError extends Error {
  declare cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'FatalError';
    if (options && 'cause' in options) setCause(this, options.cause);

    // Preserve prototype chain for `instanceof` checks across realms.
    Object.setPrototypeOf(this, FatalError.prototype);
  }
}
