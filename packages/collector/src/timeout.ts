import { StepError } from '@walkeros/core';

export {
  DEFAULT_DESTINATION_TIMEOUT_MS,
  resolveDestinationTimeout,
} from '@walkeros/core';

/**
 * Error thrown when a destination delivery does not settle within its timeout:
 * a `StepError` with code `timeout` (retryable). The dedicated `name` lets DLQ
 * consumers discriminate a timeout from a destination-thrown error without
 * substring matching the message.
 */
export class DestinationTimeoutError extends StepError {
  constructor(message: string) {
    super(message, { code: 'timeout' });
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
