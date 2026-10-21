import { resolveDestinationTimeout } from '@walkeros/core';

/** Share of the destination's timeout one SDK attempt may take. */
const ATTEMPT_SHARE = 0.25;

/** Share of the timeout an SDK with a configurable wait waits before a retry. */
const WAIT_SHARE = 0.1;

/** At most three attempts: the first one and two retries. */
const MAX_RETRIES = 2;

/** How an SDK's own retry fits the destination's timeout. */
export interface RetryBudget {
  /** Time one attempt (one request) may take, in ms. */
  attempt: number;
  /** Retries after the first attempt. */
  retries: number;
  /** Wait before a retry, for an SDK whose wait is configurable, in ms. */
  wait: number;
}

/**
 * The retry an SDK destination configures, so a send's worst case ends
 * before the collector stops waiting (`config.timeout`, 10 s by default): a
 * quarter of the timeout per attempt, and at most two retries, as many as fit
 * together with the SDK's waits between them. `waited(retries, wait)` is the
 * SDK's longest total wait before that many retries, given the configurable
 * wait; without it the SDK is set to wait `wait`, a tenth of the timeout,
 * before each retry.
 */
export function retryBudget(
  timeout?: number,
  waited: (retries: number, wait: number) => number = (retries, wait) =>
    retries * wait,
): RetryBudget {
  const total = resolveDestinationTimeout(timeout);
  const attempt = Math.floor(total * ATTEMPT_SHARE);
  const wait = Math.floor(total * WAIT_SHARE);
  let retries = MAX_RETRIES;
  while (retries > 0 && (retries + 1) * attempt + waited(retries, wait) > total)
    retries--;
  return { attempt, retries, wait };
}
