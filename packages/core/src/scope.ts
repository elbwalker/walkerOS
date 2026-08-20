import { isArray, isObject } from './is';

/**
 * Normalizes a platform header collection into a plain bag with lowercased
 * keys and string values.
 *
 * Accepts a Fetch `Headers` instance, a Node style header bag whose values may
 * be arrays, or anything else, which yields an empty bag. Repeated values are
 * joined with ', ' following the RFC 9110 rule for combining field values, so
 * a consumer never has to branch on the value type.
 *
 * @param input The platform header collection.
 * @returns Header names lowercased, values as strings.
 */
export function normalizeHeaders(input: unknown): Record<string, string> {
  const headers: Record<string, string> = {};

  if (!input || typeof input !== 'object' || isArray(input)) return headers;

  const iterable = input as { forEach?: unknown };
  if (typeof iterable.forEach === 'function') {
    // A Headers instance yields (value, name) and has already lowercased names.
    (input as Headers).forEach((value, name) => {
      headers[name.toLowerCase()] = value;
    });
    return headers;
  }

  Object.entries(input as Record<string, unknown>).forEach(([name, value]) => {
    if (value === undefined) return;
    headers[name.toLowerCase()] = isArray(value)
      ? value.join(', ')
      : String(value);
  });

  return headers;
}

/**
 * Normalizes a query string into a flat bag of string values.
 *
 * One algorithm on every platform, so a mapping resolves the same everywhere.
 * Repeated keys are joined with ',' rather than kept as arrays, matching the
 * single string value type the scope contract promises. Structured parsing
 * stays available through the scope's `raw`.
 *
 * @param queryString The query string, with or without a leading '?'.
 * @returns Query parameters as strings.
 */
export function normalizeQuery(queryString: string): Record<string, string> {
  const query: Record<string, string> = {};
  if (!queryString) return query;

  const params = new URLSearchParams(
    queryString.startsWith('?') ? queryString.slice(1) : queryString,
  );

  params.forEach((value, key) => {
    query[key] = key in query ? `${query[key]},${value}` : value;
  });

  return query;
}

/**
 * Normalizes a request body into the value it represents.
 *
 * Parsing happens once, at the source boundary, so `ingest.body` and the event
 * the pipeline receives can never disagree. A body that does not parse as JSON
 * is returned unchanged, which is what lets a `source.before` transformer
 * decode raw input.
 *
 * @param body The raw body.
 * @param base64 Whether the body is base64 encoded and must be decoded first.
 * @returns The parsed value, or the input unchanged when it does not parse.
 */
export function normalizeBody(body: unknown, base64?: boolean): unknown {
  if (typeof body !== 'string') return body;

  let text = body;
  if (base64) {
    // atob is untyped in core (no DOM lib, no own @types/node) but present in
    // every runtime we target: structural access, as in preview.ts.
    const atobFn = (globalThis as { atob?: (data: string) => string }).atob;
    if (!atobFn) return body;
    try {
      const binary = atobFn(body);
      // UTF-8 decode without TextDecoder, which core cannot rely on.
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      text = decodeURIComponent(
        Array.from(
          bytes,
          (byte) => `%${byte.toString(16).padStart(2, '0')}`,
        ).join(''),
      );
    } catch {
      return body;
    }
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text === body ? body : text;
  }
}

/**
 * Reports whether a value satisfies the scope contract's shape.
 *
 * Sources can be user authored, so a consumer that must not assume the type
 * holds at runtime uses this rather than trusting the declaration.
 *
 * @param value The value to check.
 * @returns True when the value carries the required scope fields.
 */
export function isScope(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.method === 'string' &&
    isObject(value.headers)
  );
}
