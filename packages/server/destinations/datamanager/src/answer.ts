import type { WalkerOS } from '@walkeros/core';
import { isObject, isString } from '@walkeros/core';

// The parts of Google's answer a message or log line may carry: enum names,
// field paths and quota names. Anything else is left out, so a value the
// destination sent, or Google's own description of it, never reaches a line.
const ENUM = /^[A-Z][A-Z0-9_]{2,63}$/;
const FIELD = /^[a-z][a-z0-9_.[\]]{0,199}$/;
const QUOTA = /^[A-Za-z]{1,100}$/;

const MAX_VIOLATIONS = 3;
const BAD_REQUEST = 'type.googleapis.com/google.rpc.BadRequest';
const ERROR_INFO = 'type.googleapis.com/google.rpc.ErrorInfo';

function matching(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === 'string' && pattern.test(value) ? value : undefined;
}

/** A violation or warning as `<REASON> at <field>`, when both parts are safe. */
function reasonAtField(entry: unknown): string | undefined {
  if (!isObject(entry)) return undefined;
  const reason = matching(entry.reason, ENUM);
  const field = matching(entry.field, FIELD);
  return reason && field ? `${reason} at ${field}` : undefined;
}

function errorOf(body: unknown): WalkerOS.AnyObject | undefined {
  return isObject(body) && isObject(body.error) ? body.error : undefined;
}

function detailsOf(body: unknown, type: string): WalkerOS.AnyObject[] {
  const details = errorOf(body)?.details;
  if (!Array.isArray(details)) return [];
  return details.filter(isObject).filter((detail) => detail['@type'] === type);
}

function errorInfoParts(body: unknown): string[] {
  const [info] = detailsOf(body, ERROR_INFO);
  if (!info) return [];
  const quota = isObject(info.metadata)
    ? matching(info.metadata.quota_limit, QUOTA)
    : undefined;
  return [matching(info.reason, ENUM), quota].filter(isString);
}

/** Google's RPC status of an error body, such as `ABORTED`. */
export function rpcStatusOf(body: unknown): string | undefined {
  return matching(errorOf(body)?.status, ENUM);
}

/**
 * The message of a refused request: the HTTP and RPC status, then up to
 * three field violations, or else the error's reason and quota name.
 */
export function refusalMessage(status: number, body: unknown): string {
  const rpcStatus = rpcStatusOf(body);
  const head = `Data Manager API error (${rpcStatus ? `${status} ${rpcStatus}` : status})`;
  const violations = detailsOf(body, BAD_REQUEST)
    .flatMap((detail) =>
      Array.isArray(detail.fieldViolations) ? detail.fieldViolations : [],
    )
    .map(reasonAtField)
    .filter(isString)
    .slice(0, MAX_VIOLATIONS);
  const parts = violations.length ? violations : errorInfoParts(body);
  return parts.length ? `${head}: ${parts.join(', ')}` : head;
}

/**
 * The fields Google dropped from an accepted event, as `<REASON> at <field>`.
 * An entry with a part that is not safe to log is only counted, so every
 * non-empty `fieldWarnings` gives a line: `<parts>, 2 more field warnings`,
 * or `2 field warnings` when no entry is safe.
 */
export function fieldWarningsOf(data: unknown): string[] {
  if (!isObject(data) || !Array.isArray(data.fieldWarnings)) return [];
  const entries: unknown[] = data.fieldWarnings;
  const parts = entries.map(reasonAtField).filter(isString);
  const unsafe = entries.length - parts.length;
  if (unsafe === 0) return parts;
  const noun = unsafe === 1 ? 'field warning' : 'field warnings';
  return [
    ...parts,
    parts.length ? `${unsafe} more ${noun}` : `${unsafe} ${noun}`,
  ];
}
