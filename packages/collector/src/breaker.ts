import type { BreakerState, Destination } from '@walkeros/core';

/**
 * Step-general circuit breaker.
 *
 * State lives in `collector.status.breakers`, keyed by `stepId()` so the
 * breaker is step-agnostic (destinations are the primary use today). All sites
 * — the skip gate, the per-event failure/success accounting, the batch flush —
 * drive their state changes through this one module so the gate and the
 * accounting can never disagree about a step's health.
 *
 * The breaker is presence-gated: a step with no `breaker` config never trips
 * (the caller skips this module entirely when {@link resolveBreakerConfig}
 * returns `undefined`).
 *
 * Time is read through an injectable `now()` so open→half-open transitions are
 * deterministic in tests without fake timers (mirrors `ErrorRing` in the cli).
 */

export const DEFAULT_BREAKER_THRESHOLD = 5;
export const DEFAULT_BREAKER_COOLDOWN_MS = 30_000;

/** Resolved, presence-checked breaker tuning for one step. */
export interface BreakerConfig {
  threshold: number;
  cooldown: number;
}

/**
 * The kind of transport outcome a step site reports. `transport-failure`
 * counts toward opening; `success` resets and closes; `partial` is a
 * deliberate no-op (row-level batch failures must not trip a healthy
 * destination).
 */
export type StepOutcome = 'transport-failure' | 'success' | 'partial';

/**
 * Injectable clock. Default reads wall time; tests swap it via
 * {@link __setBreakerNow} so open→half-open is deterministic.
 */
let nowFn: () => number = () => Date.now();

/** Test-only: override the breaker clock. */
export function __setBreakerNow(fn: () => number): void {
  nowFn = fn;
}

/** Test-only: restore the real-time breaker clock. */
export function __resetBreakerNow(): void {
  nowFn = () => Date.now();
}

/** Current breaker time (injectable). */
export function breakerNow(): number {
  return nowFn();
}

/**
 * Resolve a destination's `breaker` config into tuned values, or `undefined`
 * when no breaker is configured (presence-gating: the breaker stays inert).
 * A bare number is the threshold.
 */
export function resolveBreakerConfig(
  breaker: Destination.Config['breaker'],
): BreakerConfig | undefined {
  if (breaker === undefined) return undefined;
  if (typeof breaker === 'number') {
    return { threshold: breaker, cooldown: DEFAULT_BREAKER_COOLDOWN_MS };
  }
  return {
    threshold: breaker.threshold ?? DEFAULT_BREAKER_THRESHOLD,
    cooldown: breaker.cooldown ?? DEFAULT_BREAKER_COOLDOWN_MS,
  };
}

/** Lazily create and return the breaker state for a step. */
export function ensureBreakerState(
  breakers: Record<string, BreakerState>,
  key: string,
): BreakerState {
  if (!breakers[key]) {
    breakers[key] = { state: 'closed', consecutiveFailures: 0 };
  }
  return breakers[key];
}

/**
 * The skip gate. Returns true when the step should be skipped (breaker open
 * and no probe slot available for this caller).
 *
 * On the open→half-open boundary the transition is atomic within this
 * synchronous call: the FIRST event at/after `openUntil` claims the probe
 * (sets `state='half-open'`, `probing=true`, re-arms `openUntil`) and is
 * admitted; every concurrent event then sees half-open with the probe taken
 * and skips. Single-threaded JS guarantees this mutate-before-return is not
 * interleaved with another gate call.
 */
export function isBreakerOpen(
  breakers: Record<string, BreakerState>,
  key: string,
  cooldown: number,
): boolean {
  const breaker = breakers[key];
  if (!breaker || breaker.state === 'closed') return false;

  if (breaker.state === 'half-open') {
    // Probe slot already claimed by an earlier event in this window.
    return breaker.probing === true;
  }

  // state === 'open'
  const now = nowFn();
  if (breaker.openUntil !== undefined && now < breaker.openUntil) {
    return true; // still cooling down
  }

  // Cooldown elapsed: this caller becomes the single probe. Re-arm the window
  // and take the probe slot so concurrent callers still skip.
  breaker.state = 'half-open';
  breaker.probing = true;
  breaker.openUntil = now + cooldown;
  return false;
}

/**
 * Record a transport outcome for a step and apply the resulting state
 * transition. The single accounting authority for all sites.
 */
export function recordStepOutcome(
  breakers: Record<string, BreakerState>,
  key: string,
  outcome: StepOutcome,
  threshold: number,
  cooldown: number,
): void {
  if (outcome === 'partial') return; // breaker-neutral

  const breaker = ensureBreakerState(breakers, key);

  if (outcome === 'success') {
    breaker.consecutiveFailures = 0;
    breaker.state = 'closed';
    breaker.probing = false;
    breaker.openUntil = undefined;
    return;
  }

  // transport-failure
  breaker.consecutiveFailures += 1;

  if (breaker.state === 'half-open') {
    // The probe failed: re-open with a fresh cooldown window.
    breaker.state = 'open';
    breaker.probing = false;
    breaker.openUntil = nowFn() + cooldown;
    return;
  }

  if (breaker.consecutiveFailures >= threshold) {
    breaker.state = 'open';
    breaker.probing = false;
    breaker.openUntil = nowFn() + cooldown;
  }
}

/**
 * Release a half-open probe slot WITHOUT recording an outcome. Called when an
 * admitted probe event settles on a path that never exercised the transport
 * (consent-denied, empty queue, queueOn-only, re-queued). The probe never
 * tested transport health, so it must not count as a failure or a success;
 * instead the breaker reverts half-open → open, keeping `consecutiveFailures`
 * intact, so the next event at/after the (already re-armed) `openUntil` can
 * probe again. Without this, an admitted probe that never pushes would leave
 * `probing=true` forever and the breaker would deadlock half-open.
 *
 * No-op unless the breaker is currently half-open with a probe in flight.
 */
export function releaseProbe(
  breakers: Record<string, BreakerState>,
  key: string,
): void {
  const breaker = breakers[key];
  if (!breaker || breaker.state !== 'half-open' || breaker.probing !== true) {
    return;
  }
  breaker.state = 'open';
  breaker.probing = false;
}

/**
 * Predicate exposed for the BigQuery self-heal re-open (Task 4): true when a
 * probe would be permitted at `now` — the breaker is closed, half-open, or
 * open with its cooldown elapsed. Task 4 gates its re-open on this.
 */
export function isBreakerProbePermitted(
  breaker: BreakerState | undefined,
  now: number,
): boolean {
  if (!breaker) return true;
  if (breaker.state === 'closed' || breaker.state === 'half-open') return true;
  return breaker.openUntil !== undefined && now >= breaker.openUntil;
}
