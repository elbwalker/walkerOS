import type { WalkerOS } from '@walkeros/core';

/**
 * One insert row, in the canonical walkerOS Event v4 column order: name, data,
 * context, globals, custom, user, nested, consent, id, trigger, entity,
 * action, timestamp, timing, source.
 *
 * Payload columns are JSON-encoded strings rather than nested structures, so
 * the table needs no schema knowledge of what a flow sends. Hot keys become
 * real columns in the table's own DDL through `MATERIALIZED` expressions over
 * these strings, which costs the destination nothing.
 *
 * No column is nullable. Inserts run with `input_format_null_as_default = 0`,
 * which turns a stray `null` into a loud server-side error instead of a silent
 * default, so an absent payload has to arrive as an empty string. A non-finite
 * `timing` is the one value the type still admits that reaches the wire as a
 * null, `JSON.stringify` writing `NaN` and `Infinity` that way: the server
 * rejects the batch, the rejection is terminal and is not retried, and the
 * wrong number stays visible in the event rather than becoming a plausible `0`
 * in the table.
 */
export interface ClickHouseRow {
  [column: string]: string | number;
  name: string;
  data: string;
  context: string;
  globals: string;
  custom: string;
  user: string;
  nested: string;
  consent: string;
  id: string;
  trigger: string;
  entity: string;
  action: string;
  timestamp: string;
  timing: number;
  source: string;
}

/**
 * A row as the insert path receives it: the canonical shape above, or the
 * object a flow's mapping placed in `context.data`.
 *
 * A mapped row replaces the canonical one wholesale and travels verbatim, so a
 * partner whose table is not the reference DDL configures its columns in the
 * flow. Its shape is whatever the flow wrote, and this type claims no more
 * than that.
 */
export type InsertRow = ClickHouseRow | WalkerOS.AnyObject;

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

/**
 * `YYYY-MM-DD hh:mm:ss.SSS` in UTC, the one literal every ClickHouse server
 * reads the same way. The `basic` date parser rejects the ISO 8601 `T` and `Z`
 * markers, and a bare number is read as Unix seconds by newer servers but as
 * the raw value at the column's precision by older ones, so epoch
 * milliseconds would land off by a factor of 1000 depending on the version.
 * The reference DDL declares the column `DateTime64(3, 'UTC')`, and a string
 * is read in the column's own timezone.
 */
function toDateTime(timestamp: number): string {
  const date = new Date(timestamp);

  const day = [
    pad(date.getUTCFullYear(), 4),
    pad(date.getUTCMonth() + 1, 2),
    pad(date.getUTCDate(), 2),
  ].join('-');

  const time = [
    pad(date.getUTCHours(), 2),
    pad(date.getUTCMinutes(), 2),
    pad(date.getUTCSeconds(), 2),
  ].join(':');

  return `${day} ${time}.${pad(date.getUTCMilliseconds(), 3)}`;
}

/**
 * JSON for anything carrying content, `''` for anything not. Absent values,
 * empty objects and empty arrays collapse to the same empty string so no
 * column ever holds a null.
 */
function jsonOrEmpty(value: unknown): string {
  if (value === undefined || value === null) return '';

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
    } else if (Object.keys(value).length === 0) return '';
  }

  return JSON.stringify(value);
}

/** Convert one walkerOS event into one ClickHouse row. */
export function eventToRow(event: WalkerOS.Event): ClickHouseRow {
  return {
    name: event.name,
    data: jsonOrEmpty(event.data),
    context: jsonOrEmpty(event.context),
    globals: jsonOrEmpty(event.globals),
    custom: jsonOrEmpty(event.custom),
    user: jsonOrEmpty(event.user),
    nested: jsonOrEmpty(event.nested),
    consent: jsonOrEmpty(event.consent),
    id: event.id,
    trigger: event.trigger,
    entity: event.entity,
    action: event.action,
    timestamp: toDateTime(event.timestamp),
    timing: event.timing,
    source: jsonOrEmpty(event.source),
  };
}
