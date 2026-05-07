import type { WalkerOS } from '@walkeros/core';

/** Row shape passed to JSONWriter.appendRows. Values are JSON-serializable scalars or strings. */
export interface BigQueryRow {
  [key: string]: string | number | null;
  name: string;
  data: string | null;
  context: string | null;
  globals: string | null;
  custom: string | null;
  user: string | null;
  nested: string | null;
  consent: string | null;
  id: string;
  trigger: string;
  entity: string;
  action: string;
  timestamp: number;
  timing: number;
  source: string | null;
}

function jsonOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object') {
    if (Array.isArray(value) && value.length === 0) return null;
    if (!Array.isArray(value) && Object.keys(value).length === 0) return null;
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

/** Convert a walkerOS Event v4 into a 15-column BigQuery row in canonical order.
 *
 * Note: BQ Storage Write API encodes TIMESTAMP fields as INT64 microseconds
 * since epoch (the SDK calls Long.fromString on the value). ISO strings fail
 * with "interior hyphen" because Long.fromString sees the date hyphens as
 * non-numeric. Pass microseconds directly.
 */
export function eventToRow(event: WalkerOS.Event): BigQueryRow {
  return {
    name: event.name,
    data: jsonOrNull(event.data),
    context: jsonOrNull(event.context),
    globals: jsonOrNull(event.globals),
    custom: jsonOrNull(event.custom),
    user: jsonOrNull(event.user),
    nested: jsonOrNull(event.nested),
    consent: jsonOrNull(event.consent),
    id: event.id,
    trigger: event.trigger,
    entity: event.entity,
    action: event.action,
    timestamp: new Date(event.timestamp).getTime() * 1000, // microseconds since epoch
    timing: event.timing,
    source: jsonOrNull(event.source),
  };
}
