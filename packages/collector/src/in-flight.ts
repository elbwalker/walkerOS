import type { Collector, Elb } from '@walkeros/core';
import { reportCause, StepError, toFailureReason } from '@walkeros/core';
import { createPushResult } from './destination';

/** The pushes of one collector that run now, and who waits for none to run. */
interface InFlight {
  running: number;
  idle: Set<() => void>;
  /** The push an event a source push admitted takes, without the guard. */
  admitted?: Collector.PushFn;
}

// Keyed by the collector, so its public type carries none of this.
const inFlight = new WeakMap<Collector.Instance, InFlight>();

function stateOf(collector: Collector.Instance): InFlight {
  let state = inFlight.get(collector);
  if (!state) {
    state = { running: 0, idle: new Set() };
    inFlight.set(collector, state);
  }
  return state;
}

/** Counts `work` as a running push of `collector` until it settles. */
export async function trackPush<T>(
  collector: Collector.Instance,
  work: () => Promise<T>,
): Promise<T> {
  const state = stateOf(collector);
  state.running++;
  try {
    return await work();
  } finally {
    state.running--;
    if (state.running === 0) {
      const waiting = [...state.idle];
      state.idle.clear();
      waiting.forEach((settled) => settled());
    }
  }
}

/**
 * Resolves with 0 once no tracked push runs, or at deadlineAt with the number
 * still running. Its timer never outlives it.
 */
export function pushesSettled(
  collector: Collector.Instance,
  deadlineAt: number,
): Promise<number> {
  const state = stateOf(collector);
  if (state.running === 0) return Promise.resolve(0);
  const ms = deadlineAt - Date.now();
  if (ms <= 0) return Promise.resolve(state.running);
  return new Promise<number>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settled = (): void => {
      if (timer) clearTimeout(timer);
      resolve(0);
    };
    timer = setTimeout(() => {
      state.idle.delete(settled);
      resolve(state.running);
    }, ms);
    state.idle.add(settled);
  });
}

/**
 * The answer to a push that enters after the shutdown began: ok false,
 * reason shutting-down, counted, one cause line. A retry reaches the next
 * instance, so the reason is retryable.
 */
export function refuseWhileShuttingDown(
  collector: Collector.Instance,
  eventName: unknown,
): Elb.PushResult {
  const reason = toFailureReason(
    new StepError('collector is shutting down: push refused', {
      code: 'shutting-down',
    }),
  );
  collector.status.failed++;
  reportCause(
    collector,
    collector.logger,
    { step: 'collector', code: reason.code },
    'Push refused',
    { event: eventName, retryable: reason.retryable, error: reason.message },
  );
  return createPushResult({ ok: false, reason, error: reason.message });
}

/**
 * createPush registers its unguarded push here; executePush hands an
 * admitted event to it, never through the guard, so an event admitted before
 * the shutdown began is never refused on its way in.
 */
export function setAdmittedPush(
  collector: Collector.Instance,
  push: Collector.PushFn,
): void {
  stateOf(collector).admitted = push;
}

/**
 * The unguarded push of `collector`. A collector that createPush did not
 * build has no guard to pass, so its own push is the admitted one.
 */
export function admittedPush(collector: Collector.Instance): Collector.PushFn {
  return inFlight.get(collector)?.admitted ?? collector.push;
}
