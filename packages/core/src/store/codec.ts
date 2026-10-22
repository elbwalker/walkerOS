import type { StoreValue } from '../types/store';

/**
 * The neutral half of the store codec: the guard a cache uses to narrow a
 * wide value to `StoreValue`. The byte codec itself reads `Buffer`, so it
 * lives in the node entry (`@walkeros/core/node`, `../node/storeCodec`).
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Recursive type guard: the restored value is structurally a `StoreValue`.
 * The single restore walk (`fromSerializableWith`) is JSON-derived plus
 * `Uint8Array` binary leaves, so this always holds; the guard makes the
 * narrowing explicit and cast-free at the public boundary.
 *
 * The guard accepts exactly what the serializer can encode. An `undefined`
 * object property is dropped and an `undefined` array element becomes `null`
 * on `JSON.stringify`, so an `undefined` nested value does NOT disqualify the
 * containing value (matching the serializer's runtime tolerance at the
 * `unknown -> StoreValue` boundary). The `StoreValue` TYPE still excludes
 * `undefined`; this only mirrors what survives serialization.
 */
export function isStoreValue(value: unknown): value is StoreValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Uint8Array
  )
    return true;
  if (Array.isArray(value))
    return value.every((v) => v === undefined || isStoreValue(v));
  if (isRecord(value))
    return Object.values(value).every(
      (v) => v === undefined || isStoreValue(v),
    );
  return false;
}
