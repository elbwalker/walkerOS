import type { StoreValue } from '../types/store';

/**
 * Shared structured codec for store values.
 *
 * Stateless, format-only: serializes a `StoreValue` to a UTF-8 JSON byte
 * payload and restores it, with no store-type branches. Binary leaves are
 * tagged base64 behind a reserved marker; user objects that happen to carry
 * the marker are escaped, so NO payload can be corrupted. On the store path
 * binary always decodes back to a platform-neutral `Uint8Array`, never a Node
 * `Buffer`.
 */

const CACHE_MARKER = '__walkeros_cache__';

/**
 * Thrown when a value cannot be serialized (e.g. a cyclic structure that
 * `JSON.stringify` rejects). Catchable and distinguishable from a raw
 * `TypeError` leaking out of the platform JSON implementation.
 */
export class StoreCodecError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StoreCodecError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Precondition: the input is acyclic JSON-shaped data; binary leaves are the
// only non-JSON values handled. A Node `Buffer`, any `Uint8Array` (e.g. a
// Fetch-sourced body), and a raw `ArrayBuffer` all normalize to the same
// base64 'buffer' tag and decode back through the caller-supplied binary
// factory (see fromSerializableWith). A `Buffer` IS a `Uint8Array`, but under
// split realms (jsdom test env) a Node `Buffer` fails the `instanceof
// Uint8Array` check against the realm's `Uint8Array`, so the realm-independent
// `Buffer.isBuffer` check stays FIRST. The `Uint8Array` branch then handles
// typed-array views by slicing on byteOffset/byteLength so a subarray view
// contributes only its own bytes.
function toSerializable(value: unknown): unknown {
  if (Buffer.isBuffer(value))
    return { [CACHE_MARKER]: 'buffer', d: value.toString('base64') };
  if (value instanceof Uint8Array)
    return {
      [CACHE_MARKER]: 'buffer',
      d: Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString(
        'base64',
      ),
    };
  if (value instanceof ArrayBuffer)
    return {
      [CACHE_MARKER]: 'buffer',
      d: Buffer.from(value).toString('base64'),
    };
  if (Array.isArray(value)) return value.map(toSerializable);
  if (isRecord(value)) {
    if (CACHE_MARKER in value) {
      const inner: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) inner[k] = toSerializable(v);
      return { [CACHE_MARKER]: 'escape', d: inner };
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toSerializable(v);
    return out;
  }
  return value;
}

/**
 * Single traversal that restores the serialized form. The binary-leaf type is
 * supplied by the caller via `toBinary`; the store path constructs a plain
 * `Uint8Array`. Parametrizing the leaf factory keeps one implementation of the
 * walk while leaving the binary representation to the caller.
 */
function fromSerializableWith(
  value: unknown,
  toBinary: (buf: Buffer) => Uint8Array,
): unknown {
  if (isRecord(value)) {
    if (CACHE_MARKER in value) {
      const tag = value[CACHE_MARKER];
      const data = value.d;
      if (tag === 'buffer' && typeof data === 'string')
        return toBinary(Buffer.from(data, 'base64'));
      if (tag === 'escape' && isRecord(data)) {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data))
          out[k] = fromSerializableWith(v, toBinary);
        return out;
      }
      // Unrecognized tag (not 'buffer'/'escape'): fall through to default
      // object traversal so a user object that merely carries the marker key,
      // or a value from a future tag version, is preserved verbatim rather
      // than coerced.
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value))
      out[k] = fromSerializableWith(v, toBinary);
    return out;
  }
  if (Array.isArray(value))
    return value.map((v) => fromSerializableWith(v, toBinary));
  return value;
}

// Store path: binary leaves become a plain, platform-neutral Uint8Array (a
// standalone view over the exact decoded bytes), never a Node Buffer.
function toStoreBinary(buf: Buffer): Uint8Array {
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
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
function isStoreValue(value: unknown): value is StoreValue {
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

/**
 * Serialize a `StoreValue` to its UTF-8 JSON byte payload. Throws
 * `StoreCodecError` if the value cannot be encoded (e.g. a cyclic structure).
 */
export function serializeStoreValue(value: StoreValue): Uint8Array {
  let json: string;
  try {
    json = JSON.stringify(toSerializable(value));
  } catch (cause) {
    throw new StoreCodecError(
      'Failed to serialize store value (likely a cyclic structure).',
      { cause },
    );
  }
  return new Uint8Array(Buffer.from(json, 'utf8'));
}

/**
 * Restore a `StoreValue` from its UTF-8 JSON byte payload (or a JSON string).
 */
export function deserializeStoreValue(raw: Uint8Array | string): StoreValue {
  const text =
    typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
  const restored = fromSerializableWith(JSON.parse(text), toStoreBinary);
  if (!isStoreValue(restored))
    throw new StoreCodecError('Restored value is not a valid StoreValue.');
  return restored;
}

// Internal format helpers shared with the cache envelope codec (cache.ts) so
// there is exactly one implementation of the structured transform.
// `isStoreValue` lets boundary callers (the event cache) narrow a wide
// `unknown` payload to `StoreValue` without a cast before wrapping it.
export {
  toSerializable,
  fromSerializableWith,
  CACHE_MARKER,
  isRecord,
  isStoreValue,
};
