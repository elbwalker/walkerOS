import type { Elb, WalkerOS } from './types';
import { isArray, isObject } from './is';

/**
 * Normalize an inbound request body into the list of events it carries.
 *
 * Four rules, in order:
 * 1. A bare top-level array is N events.
 * 2. An object with an array `batch` key is N events, the canonical envelope.
 * 3. Any other object is one event, forwarded verbatim.
 * 4. Anything else (a string, a number, null, an unparseable body) is raw
 *    input, yielding a single empty event so a `source.before` chain can
 *    decode it from `ingest.body`.
 *
 * Validation is not performed here: an object that is not a valid event
 * reaches the collector's gate, which is the one place that decides what an
 * event is. An explicit empty batch is a well-formed request carrying zero
 * events, so it yields an empty list rather than a raw-input event.
 *
 * @param body The parsed request body.
 * @returns The events the body carries.
 */
export function toEventList(body: unknown): WalkerOS.DeepPartialEvent[] {
  if (isArray(body)) return body as WalkerOS.DeepPartialEvent[];

  if (isObject(body)) {
    if (isArray(body.batch)) return body.batch as WalkerOS.DeepPartialEvent[];
    return [body as WalkerOS.DeepPartialEvent];
  }

  return [{}];
}

/**
 * Reports whether a body used a batch form, independently of how many events
 * it carries.
 *
 * Form and count are two different questions. A one element batch is still a
 * batch, and answers with the batch response shape, so a caller must not infer
 * the form from the event count.
 *
 * @param body The parsed request body.
 * @returns True for a bare array or an object with an array `batch` key.
 */
export function isBatchBody(body: unknown): boolean {
  if (isArray(body)) return true;
  return isObject(body) && isArray(body.batch);
}

/**
 * The outcome of delivering one event of a batch.
 *
 * `id` is present when the event was accepted and minted one. `error` is
 * present when it was not accepted.
 */
export interface EventOutcome {
  id?: string;
  error?: string;
}

/** A batch response: the status to answer with, and the body to send. */
export interface BatchResponse {
  status: 200 | 207;
  body: {
    success: boolean;
    processed: number;
    failed?: number;
    ids?: (string | null)[];
    errors?: Array<{ index: number; error: string }>;
  };
}

/**
 * Builds the shared batch response from per event outcomes.
 *
 * One assembly for every source, so the status, the field names and the index
 * alignment cannot drift apart. `ids` is index aligned with the submitted
 * batch: an accepted event with no id is `null` rather than omitted, so
 * `ids[i]` always describes the caller's `i`th event.
 *
 * @param outcomes One entry per event, in submission order.
 * @returns The status and body to answer with.
 */
export function batchResponse(outcomes: EventOutcome[]): BatchResponse {
  const errors = outcomes.flatMap((outcome, index) =>
    outcome.error ? [{ index, error: outcome.error }] : [],
  );

  if (errors.length) {
    return {
      status: 207,
      body: {
        success: false,
        processed: outcomes.length - errors.length,
        failed: errors.length,
        errors,
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      processed: outcomes.length,
      ids: outcomes.map((outcome) => outcome.id ?? null),
    },
  };
}

/**
 * Maps a collector push result onto a batch event outcome.
 *
 * @param result The push result, or undefined when the push returned none.
 * @returns The outcome for this event.
 */
export function pushResultToOutcome(result: {
  ok?: boolean;
  invalid?: boolean;
  error?: string;
  event?: { id?: string };
}): EventOutcome {
  if (result?.ok === false) {
    return {
      error:
        result.error ??
        (result.invalid === true ? 'Invalid event' : 'Event was not processed'),
    };
  }
  return { id: result?.event?.id };
}

/** What a producer does with the message that carried a push. */
export type Acknowledgement = 'ack' | 'retry' | 'reject';

/**
 * Decides from a push result whether a producer acks, retries or rejects the
 * message that carried it: invalid input is `reject`, a delivered or queued
 * event `ack`. A failure is `retry` when any of its reasons is retryable and
 * `ack` when every reason is deterministic (a redelivery cannot fix a missing
 * setting or a 4xx; the event is in the DLQ and its cause line is logged). A
 * failure without any reason is `retry`, so an unclassified failure never
 * deletes a message. Only `retryable` is read, never an error text.
 *
 * @param result The push result.
 * @returns `ack`, `retry` or `reject`.
 */
export function acknowledge(result: Elb.PushResult): Acknowledgement {
  if (result.invalid === true) return 'reject';
  if (result.ok) return 'ack';

  const retryable: boolean[] = [];
  for (const ref of Object.values(result.failed ?? {})) {
    const reason = ref.reason;
    retryable.push(reason && 'retryable' in reason ? reason.retryable : true);
  }
  if (result.reason) retryable.push(result.reason.retryable);

  if (retryable.length === 0) return 'retry';
  return retryable.some(Boolean) ? 'retry' : 'ack';
}
