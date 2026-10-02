/**
 * Default per-destination delivery timeout in ms. Applied when a destination's
 * `config.timeout` is `0` or undefined. A hung delivery is converted into a
 * counted DLQ failure after this window so one slow destination never wedges
 * the collector push.
 */
export const DEFAULT_DESTINATION_TIMEOUT_MS = 10_000;

/**
 * Resolve the effective delivery timeout for a destination. A positive number
 * wins; `0` or undefined falls back to {@link DEFAULT_DESTINATION_TIMEOUT_MS}.
 */
export function resolveDestinationTimeout(timeout?: number): number {
  return typeof timeout === 'number' && timeout > 0
    ? timeout
    : DEFAULT_DESTINATION_TIMEOUT_MS;
}

/**
 * Error thrown when a destination delivery does not settle within its timeout.
 * The dedicated `name` lets DLQ consumers discriminate a timeout from a
 * destination-thrown error without substring matching the message.
 */
export class DestinationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DestinationTimeoutError';
  }
}

/**
 * Races a delivery promise against a per-destination timeout. If the work does
 * not settle within `ms`, the returned promise rejects with a
 * {@link DestinationTimeoutError}; the timer is always cleared on settle so no
 * dangling timer remains. The race is constructed per call site, so each
 * destination times out independently and one hang never affects another.
 */
export function withTimeout<T>(
  work: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DestinationTimeoutError(message)), ms);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
