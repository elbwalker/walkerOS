import type {
  Collector,
  Destination,
  FailureReason,
  WalkerOS,
} from '@walkeros/core';
import {
  emitStep,
  reportCause,
  StepError,
  stepId,
  toFailureReason,
} from '@walkeros/core';
import { journeyFields, observerStepError, stepState } from './observerEmit';
import { pushBounded, resetOverflowFlag } from './buffers';
import { DEFAULT_DLQ_MAX, bumpDropped, ensureDestStatus } from './report-error';
import { recordStepOutcome, resolveBreakerConfig } from './breaker';

/**
 * Codes the collector assigns at its own gates: the event never reached the
 * transport, so the breaker records no transport failure for them. A probe
 * the delivery pass took is settled by that pass.
 */
const GATE_CODES = [
  'breaker-open',
  'blocked',
  'queue-full',
  'not-ready',
  'mapping',
];

/** Whether a failure reached the transport (and counts for the breaker). */
export function isTransportFailure(reason: FailureReason): boolean {
  return !GATE_CODES.includes(reason.code);
}

/**
 * A thrown value as a `StepError`: a `StepError` as it is, anything else
 * wrapped with `code` (an unknown throw from a transformer is `transformer`).
 */
export function asStepError(err: unknown, code: string): StepError {
  if (err instanceof StepError) return err;
  return new StepError(err instanceof Error ? err.message : String(err), {
    code,
    cause: err,
  });
}

export interface FailureOptions {
  /** The caller already emitted the Observe `error` state of these events. */
  observed?: boolean;
  /** The cause line's message; `Push failed` by default. */
  message?: string;
  /**
   * `false`: the caller writes the one line itself (a batch's partial
   * failure summarizes its rows by cause in one line).
   */
  report?: boolean;
  /** `false`: breaker-neutral (a batch's partial-failure rows). */
  breaker?: boolean;
}

/**
 * The one outcome sink for events a destination failed: derives the reason,
 * bumps the destination's and the global `failed`, writes the bounded DLQ
 * (an eviction is an ERROR cause line), records the breaker outcome, emits
 * Observe `error` per event and writes one cause line (rate limited, never
 * the payload). Called with no events for a failure that lost none (an init
 * that threw on a flush without events). Returns the reason.
 */
export function recordFailure(
  collector: Collector.Instance,
  destination: Destination.Instance,
  id: string,
  events: WalkerOS.Event[],
  error: unknown,
  options: FailureOptions = {},
): FailureReason {
  const reason = toFailureReason(error);
  const step = stepId('destination', id);
  const destStatus = ensureDestStatus(collector, id);
  const now = Date.now();

  if (events.length) {
    destStatus.failed += events.length;
    destStatus.lastAt = now;
    collector.status.failed += events.length;

    // Bounded DLQ, oldest evicted: the evicted entries were reported failed
    // already, only their replay material is lost.
    const dlq = (destination.dlq = destination.dlq || []);
    const max = destination.config.dlqMax ?? DEFAULT_DLQ_MAX;
    let dropped = 0;
    for (const event of events)
      dropped += pushBounded(dlq, [event, error], { max }).dropped;
    if (dropped > 0) {
      const count = bumpDropped(collector.status, step, 'dlq', dropped);
      reportCause(
        collector,
        collector.logger,
        { step, code: 'dlq-overflow' },
        `destination.dlq full (dlqMax ${max}): oldest failed entries dropped`,
        { type: destination.type, count },
      );
    } else if (dlq.length < max) {
      resetOverflowFlag(dlq);
    }
    destStatus.dlqSize = dlq.length;
  }

  // The breaker counts transport failures only.
  const breakerConfig = resolveBreakerConfig(destination.config.breaker);
  if (breakerConfig && options.breaker !== false && isTransportFailure(reason))
    recordStepOutcome(
      collector.status.breakers,
      stepId('destination', destination.config.id || id),
      'transport-failure',
      breakerConfig.threshold,
      breakerConfig.cooldown,
    );

  if (!options.observed) {
    for (const event of events) {
      const state = stepState(
        collector,
        step,
        'destination',
        'error',
        typeof event.id === 'string' ? event.id : '',
        now,
        journeyFields(event, undefined, collector),
      );
      state.error = observerStepError(error);
      emitStep(collector, state);
    }
  }

  if (options.report === false) return reason;

  reportCause(
    collector,
    collector.logger,
    { step, code: reason.code, status: reason.status },
    options.message ?? 'Push failed',
    {
      type: destination.type,
      event: events[0]?.name,
      retryable: reason.retryable,
      error: reason.message,
      ...(events.length > 1 ? { count: events.length } : {}),
    },
  );

  return reason;
}

/**
 * The one skip path: an event deliberately not sent to a destination (its
 * consent denied under `consentDenied: 'skip'`, or a rule that `ignore`s
 * it). Counted in `status.destinations[id].skipped`, one DEBUG line. The
 * caller emits the Observe `skip` with its reason.
 */
export function recordSkip(
  collector: Collector.Instance,
  destination: Destination.Instance,
  id: string,
  event: WalkerOS.Event,
  reason: 'consent' | 'ignored',
): void {
  const destStatus = ensureDestStatus(collector, id);
  destStatus.skipped = (destStatus.skipped ?? 0) + 1;
  collector.logger
    .scope(destination.type || 'unknown')
    .debug('event skipped', { reason, event: event.name });
}
