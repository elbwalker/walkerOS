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
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'FatalError';

    // Preserve prototype chain for `instanceof` checks across realms.
    Object.setPrototypeOf(this, FatalError.prototype);
  }
}
