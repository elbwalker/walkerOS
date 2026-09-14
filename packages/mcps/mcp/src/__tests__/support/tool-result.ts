/**
 * Narrowing helpers for tool handler results. A handler is typed
 * `(input: unknown) => Promise<unknown>` by design, so a test that wants one
 * field out of a result narrows it through these guards rather than casting:
 * a shape that is not what the test claims fails here, naming what was there.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The structuredContent of a tool result, or a failure naming what was there instead. */
export function structured(result: unknown): Record<string, unknown> {
  if (!isRecord(result) || !isRecord(result.structuredContent)) {
    throw new Error(`Not a tool result: ${JSON.stringify(result)}`);
  }
  return result.structuredContent;
}

/** One nested object field, narrowed. */
export function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value))
    throw new Error(`Not an object: ${JSON.stringify(value)}`);
  return value;
}

/** An array of objects, narrowed element by element. */
export function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value))
    throw new Error(`Not an array: ${JSON.stringify(value)}`);
  return value.map(record);
}

/** The `next` hints a handler emitted, in order. */
export function hintsOf(result: unknown): string[] {
  const next = record(structured(result)._hints).next;
  if (!Array.isArray(next) || !next.every((hint) => typeof hint === 'string')) {
    throw new Error('No next hints on this result');
  }
  return next;
}
