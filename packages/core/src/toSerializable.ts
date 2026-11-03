/** Whether a value is a Zod schema: Zod 3 (`_def.typeName`) or Zod 4 (`_zod`). */
function isZod(value: object): boolean {
  if ('_zod' in value) return true;
  if (!('_def' in value)) return false;
  const def = value._def;
  return (
    typeof def === 'object' &&
    def !== null &&
    'typeName' in def &&
    typeof def.typeName === 'string' &&
    def.typeName.startsWith('Zod')
  );
}

/**
 * Deep-clone a value for JSON serialization, as dist/walkerOS.json publishes
 * it. The one definition: the build writes walkerOS.json with it, and the
 * step-example runner of @walkeros/collector/dev runs examples through it.
 *
 * Conventions:
 * - Functions → { $code: fn.toString() }, the function's source text
 * - Zod instances → filtered out (returns undefined)
 * - Everything else → recursively passed through
 */
export function toSerializable(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'function') return { $code: value.toString() };
  if (typeof value !== 'object') return value;
  if (isZod(value)) return undefined;
  if (Array.isArray(value)) return value.map((item) => toSerializable(item));
  const result: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    const serialized = toSerializable(inner);
    if (serialized !== undefined) result[key] = serialized;
  }
  return result;
}
