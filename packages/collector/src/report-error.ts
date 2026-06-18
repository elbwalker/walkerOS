import type {
  Collector,
  Context,
  Destination,
  Logger,
  StepKind,
  WalkerOS,
} from '@walkeros/core';
import { stepId } from '@walkeros/core';
import { pushBounded, resetOverflowFlag, warnOverflowOnce } from './buffers';
import { recordStepOutcome, resolveBreakerConfig } from './breaker';

/**
 * Maximum number of failed-push entries retained per destination DLQ before
 * FIFO drop-oldest. Mirrored by `Destination.Config.dlqMax`.
 */
export const DEFAULT_DLQ_MAX = 100;

/**
 * Ensure a per-destination status entry exists and return it.
 */
export function ensureDestStatus(
  collector: Collector.Instance,
  destId: string,
): Collector.DestinationStatus {
  if (!collector.status.destinations[destId]) {
    collector.status.destinations[destId] = {
      count: 0,
      failed: 0,
      duration: 0,
      queuePushSize: 0,
      dlqSize: 0,
    };
  }
  return collector.status.destinations[destId];
}

/**
 * Bump a drop counter under `status.dropped[stepId][buffer]`. Lazily
 * creates the per-step entry; returns the new counter value so callers
 * can pass it straight into the warn-once log payload.
 */
export function bumpDropped(
  status: Collector.Status,
  id: string,
  buffer: 'queue' | 'dlq',
  n: number,
): number {
  if (!status.dropped[id]) status.dropped[id] = {};
  const entry = status.dropped[id];
  entry[buffer] = (entry[buffer] ?? 0) + n;
  return entry[buffer]!;
}

/**
 * Routes a single event/error pair to a destination's DLQ with the bounded
 * write, overflow-warn-once, and full failure accounting (`destStatus.failed`
 * + `collector.status.failed`). This mirrors the batch flush's `routeToDlq`
 * for the single-event case: write to the DLQ AND bump the failed counters in
 * one place. (The per-event in-band push path bumps `failed` later in the
 * aggregation pass instead, so it does NOT call this; this helper is for the
 * out-of-band `reportError(err, event)` seam that has no aggregation pass.)
 */
function routeEventToDlq(
  collector: Collector.Instance,
  destination: Destination.Instance,
  destId: string,
  event: WalkerOS.Event,
  err: unknown,
  logger: Logger.Instance,
): void {
  const dlq = (destination.dlq = destination.dlq || []);
  const dlqBound = { max: destination.config.dlqMax ?? DEFAULT_DLQ_MAX };
  const dlqResult = pushBounded(dlq, [event, err], dlqBound);
  if (dlqResult.dropped > 0) {
    const droppedCount = bumpDropped(
      collector.status,
      stepId('destination', destId),
      'dlq',
      dlqResult.dropped,
    );
    warnOverflowOnce(
      dlq,
      logger,
      'destination.dlq overflow; oldest entries dropped',
      {
        buffer: 'dlq',
        destination: destId,
        cap: dlqBound.max,
        droppedCount,
      },
    );
  } else if (dlq.length < dlqBound.max) {
    resetOverflowFlag(dlq);
  }
  const destStatus = ensureDestStatus(collector, destId);
  destStatus.failed++;
  destStatus.dlqSize = dlq.length;
  collector.status.failed++;

  // A connection-level error that DLQs a specific event is a transport
  // failure: feed it to the circuit breaker so the gate picks it up.
  // Presence-gated and keyed on the canonical stepId (matching the push gate).
  const breakerConfig = resolveBreakerConfig(destination.config.breaker);
  if (breakerConfig) {
    const canonicalId = destination.config.id || destId;
    recordStepOutcome(
      collector.status.breakers,
      stepId('destination', canonicalId),
      'transport-failure',
      breakerConfig.threshold,
      breakerConfig.cooldown,
    );
  }
}

/**
 * Builds the step-general `reportError` callback for one step's context.
 *
 * This is the runtime behind `Context.Base.reportError`. It is captured ONCE
 * when a step's context is built and closes over `(collector, kind, id,
 * logger, destination)`, so a long-lived connection that holds the reference
 * keeps a valid callback for its whole lifetime — it is never rebuilt per
 * push. It runs on a detached emitter tick, so every path is internally
 * try/catch-guarded; a throw inside it would reintroduce the very
 * uncaughtException it exists to contain.
 *
 * - orphan (`reportError(err)`): bump `status.connectionErrors[stepId]` and
 *   `logger.error`. Does NOT bump `failed` (no event lost at this instant;
 *   counting it against `failed` would double-count the next push that hits
 *   the broken writer and gets DLQ'd).
 * - event-bearing (`reportError(err, event)`): route the event through the
 *   same DLQ + failure accounting an in-band push failure uses (for a
 *   destination). A step kind without a DLQ (or a destination not passed)
 *   still gets `failed`-counted and logged, never silently dropped.
 *
 * The with-event path deliberately funnels through the normal failure
 * accounting so that when circuit-breaker accounting is later attached to that
 * path, `reportError(err, event)` picks it up with no further wiring here.
 */
export function buildReportError(
  collector: Collector.Instance,
  kind: Exclude<StepKind, 'collector'>,
  id: string,
  logger: Logger.Instance,
  destination?: Destination.Instance,
): NonNullable<Context.Base['reportError']> {
  const key = stepId(kind, id);
  return (err: unknown, event?: WalkerOS.Event): void => {
    try {
      if (event) {
        if (destination) {
          routeEventToDlq(collector, destination, id, event, err, logger);
        } else {
          // No DLQ buffer for this step kind: still account + surface the
          // lost event so it is never silent.
          collector.status.failed++;
        }
        logger.error('report error', {
          error: err instanceof Error ? err.message : String(err),
          event: event.name,
        });
        return;
      }

      // Orphan / connection-level error: count it under connectionErrors,
      // not failed.
      collector.status.connectionErrors[key] =
        (collector.status.connectionErrors[key] ?? 0) + 1;
      logger.error('connection error', {
        error: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // Contained: reportError runs on a detached tick and must never throw.
    }
  };
}
