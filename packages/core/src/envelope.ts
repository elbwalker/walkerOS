import type { WalkerOS } from './types';
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
