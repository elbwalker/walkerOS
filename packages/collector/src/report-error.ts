import type {
  Collector,
  Context,
  Destination,
  Logger,
  StepKind,
  WalkerOS,
} from '@walkeros/core';
import { reportCause, stepId, toFailureReason } from '@walkeros/core';
import { recordFailure } from './outcome';

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
 * Extract loggable metadata from an unknown error: the message plus, when
 * present, the error's `name` (skipped for the default 'Error', which adds no
 * signal) and its transport `code` (gRPC status number or HTTP status). Keeps
 * connection-error lines diagnosable from logs alone (WHICH status killed a
 * stream), without serializing whole error objects into the log payload.
 */
export function errorMeta(err: unknown): {
  error: string;
  name?: string;
  code?: string | number;
} {
  const meta: { error: string; name?: string; code?: string | number } = {
    error: err instanceof Error ? err.message : String(err),
  };
  if (err instanceof Error && err.name && err.name !== 'Error') {
    meta.name = err.name;
  }
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const withCode: { code?: unknown } = err;
    if (
      typeof withCode.code === 'number' ||
      typeof withCode.code === 'string'
    ) {
      meta.code = withCode.code;
    }
  }
  return meta;
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
 *   `logger.warn`. Does NOT bump `failed` (no event lost at this instant;
 *   counting it against `failed` would double-count the next push that hits
 *   the broken writer and gets DLQ'd).
 * - event-bearing (`reportError(err, event)`): the event goes through the
 *   one outcome sink an in-band push failure uses (`recordFailure`: counters,
 *   DLQ, breaker, Observe, one cause line), for a destination. A step kind
 *   without a DLQ (or a destination not passed) still gets `failed`-counted
 *   and one cause line, never silently dropped.
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
          recordFailure(collector, destination, id, [event], err, {
            message: 'report error',
          });
        } else {
          // No DLQ buffer for this step kind: still account + surface the
          // lost event so it is never silent.
          collector.status.failed++;
          const reason = toFailureReason(err);
          reportCause(
            collector,
            logger,
            { step: key, code: reason.code, status: reason.status },
            'report error',
            {
              event: event.name,
              retryable: reason.retryable,
              error: reason.message,
            },
          );
        }
        return;
      }

      // Orphan / connection-level error: count it under connectionErrors,
      // not failed. No event was lost, so the user acts but intent is still
      // met: WARN (an event a step fails reports above, at ERROR).
      collector.status.connectionErrors[key] =
        (collector.status.connectionErrors[key] ?? 0) + 1;
      logger.warn('connection error', errorMeta(err));
    } catch {
      // Contained: reportError runs on a detached tick and must never throw.
    }
  };
}
