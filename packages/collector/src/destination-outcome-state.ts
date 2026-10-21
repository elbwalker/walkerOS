import type { Collector, Destination, QueuedReason } from '@walkeros/core';
import { StepError, stepId } from '@walkeros/core';
import { getStateHold } from './on';
import { isBreakerOpen, resolveBreakerConfig } from './breaker';

/**
 * O3: the state of a destination for one push, decided here and nowhere
 * else. Ready: deliver. Waiting: `queued` with a reason, the events are kept
 * and delivered when the condition clears. Blocked: `failed` with a reason,
 * through the one outcome sink. Consent is decided per event before any
 * blocked classification (a consent-denied event only ever waits), so the
 * callers ask `heldState` and `breakerState` for admitted events only.
 */
export type DestinationState =
  | { state: 'ready' }
  | { state: 'waiting'; reason: QueuedReason }
  | { state: 'blocked'; error: StepError };

/** Waiting for consent: the event's required consent is not granted. */
export const CONSENT_WAIT: QueuedReason = {
  code: 'consent',
  message: 'required consent is not granted',
};

/** Waiting in a batch window until it flushes. */
export const BATCH_WAIT: QueuedReason = {
  code: 'batch',
  message: 'waiting in a batch window until it flushes',
};

/** Waiting while a state delivery to the destination runs or failed. */
export const HELD_WAIT: QueuedReason = {
  code: 'held',
  message: 'a state delivery to the destination is running or failed',
};

const READY: DestinationState = { state: 'ready' };

/**
 * A held destination waits while a state delivery to it runs, and for one
 * retry window after a delivery failed; then it is blocked until a retry
 * succeeds: its events fail instead of parking for the page lifetime.
 */
export function heldState(
  destination: Destination.Instance,
  timeout: number,
  now = Date.now(),
): DestinationState {
  const hold = getStateHold(destination);
  if (!hold) return READY;
  if (hold.failedAt === undefined || now - hold.failedAt < timeout)
    return { state: 'waiting', reason: HELD_WAIT };
  return {
    state: 'blocked',
    error: new StepError(
      `destination blocked: its ${String(hold.type)} delivery failed and was not recovered within ${timeout}ms; events fail until a retry succeeds`,
      { code: 'blocked' },
    ),
  };
}

/**
 * While a destination's breaker is open its events fail with
 * `breaker-open`. Presence-gated: ready unless `config.breaker` is set. A
 * half-open breaker admits this push as its single probe (the caller settles
 * it).
 */
export function breakerState(
  collector: Collector.Instance,
  destination: Destination.Instance,
  canonicalId: string,
): DestinationState {
  const config = resolveBreakerConfig(destination.config.breaker);
  if (!config) return READY;
  const key = stepId('destination', canonicalId);
  if (!isBreakerOpen(collector.status.breakers, key, config.cooldown))
    return READY;
  const openUntil = collector.status.breakers[key]?.openUntil;
  return {
    state: 'blocked',
    error: new StepError(
      `breaker open after ${config.threshold} consecutive failures; events fail until ${
        openUntil ? new Date(openUntil).toISOString() : 'a probe succeeds'
      }; see the first failure's line`,
      { code: 'breaker-open' },
    ),
  };
}
