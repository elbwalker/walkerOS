import { TextDecoder } from 'util';

/**
 * Turn a recorded simulate value (call arguments, events, errors) into plain
 * JSON-safe data. One formatter for the CLI `push` output (`--json` and text)
 * and the MCP `flow_simulate` result, so a value a vendor call really
 * receives prints readably and never throws:
 *
 * - `Error` → `{ name, message }`
 * - `Buffer`, any typed array, `DataView`, `ArrayBuffer` → utf8 string of its
 *   bytes, or `base64:<...>` when not valid utf8
 * - `bigint` → string
 * - `Map` → array of `[key, value]` entries, `Set` → array of values
 * - a cycle → `"[Circular]"`
 * - a function → `"[Function <name>]"`
 * - a class instance (an SDK command, say) → `{ <ClassName>: <own fields> }`,
 *   named by its `Symbol.toStringTag` when it has one
 * - a value whose getter, `toJSON` or proxy trap throws → `"[Unprintable]"`
 *
 * Secrets are not this function's concern: the printed text egresses through
 * `scrubSecrets`.
 */
export function toPrintable(value: unknown): unknown {
  return walk(value, new Set());
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

function bytesToString(bytes: Uint8Array): string {
  try {
    return utf8.decode(bytes);
  } catch {
    return `base64:${Buffer.from(bytes).toString('base64')}`;
  }
}

// Values can come from another realm (a web flow simulates inside jsdom), where
// `instanceof` against this realm's constructors fails. The built-in tag does
// not depend on the realm.
function tagOf(value: object): string {
  return Object.prototype.toString.call(value);
}

function isError(value: object): value is Error {
  return tagOf(value) === '[object Error]';
}

function isArrayBuffer(value: object): value is ArrayBuffer {
  return tagOf(value) === '[object ArrayBuffer]';
}

/** The raw bytes of a typed array, `DataView` or `ArrayBuffer`. */
function bytesOf(value: object): Uint8Array | undefined {
  if (ArrayBuffer.isView(value))
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (isArrayBuffer(value)) return new Uint8Array(value);
  return undefined;
}

function isMap(value: object): value is Map<unknown, unknown> {
  return tagOf(value) === '[object Map]';
}

function isSet(value: object): value is Set<unknown> {
  return tagOf(value) === '[object Set]';
}

function hasToJSON(value: object): value is { toJSON: () => unknown } {
  return 'toJSON' in value && typeof value.toJSON === 'function';
}

/**
 * Name of a class instance; undefined for plain objects. A custom
 * `Symbol.toStringTag` wins over the constructor name, which a minifier may
 * have renamed.
 */
function className(value: object): string | undefined {
  const tag = tagOf(value).slice('[object '.length, -1);
  if (tag !== 'Object') return tag;
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto === null || proto === Object.prototype) return undefined;
  if (typeof proto !== 'object') return undefined;
  const ctor: unknown = Reflect.get(proto, 'constructor');
  // By name, not identity: a plain object from another realm has that
  // realm's `Object` as its constructor.
  if (typeof ctor !== 'function' || ctor.name === 'Object') return undefined;
  return ctor.name || undefined;
}

function walk(value: unknown, ancestors: Set<object>): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function')
    return `[Function ${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();
  if (value === null || typeof value !== 'object') return value;

  // A throwing getter, `toJSON` or proxy trap must not break the output.
  try {
    return walkObject(value, ancestors);
  } catch {
    return '[Unprintable]';
  }
}

function walkObject(value: object, ancestors: Set<object>): unknown {
  if (isError(value)) return { name: value.name, message: value.message };
  const bytes = bytesOf(value);
  if (bytes) return bytesToString(bytes);
  if (ancestors.has(value)) return '[Circular]';

  ancestors.add(value);
  try {
    if (isMap(value))
      return Array.from(value.entries(), ([k, v]) => [
        walk(k, ancestors),
        walk(v, ancestors),
      ]);
    if (isSet(value))
      return Array.from(value.values(), (v) => walk(v, ancestors));
    if (Array.isArray(value)) return value.map((v) => walk(v, ancestors));
    if (hasToJSON(value)) return walk(value.toJSON(), ancestors);

    const fields: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(value)) {
      fields[key] = walk(field, ancestors);
    }
    const name = className(value);
    return name ? { [name]: fields } : fields;
  } finally {
    ancestors.delete(value);
  }
}
