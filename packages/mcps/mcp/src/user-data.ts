/**
 * Wraps a user-writable string in `<user_data>…</user_data>` so the chat
 * assistant treats it as data, never as instructions. Inner `</user_data>`
 * sequences are mangled (`</user_data_>`) so a malicious string can't close
 * the envelope early.
 *
 * Idempotent: a string that is already a well-formed envelope with no inner
 * `</user_data>` is returned unchanged.
 */
export function wrapUserData(s: string): string {
  const alreadyWrapped =
    s.startsWith('<user_data>') &&
    s.endsWith('</user_data>') &&
    s.slice(11, -12).indexOf('</user_data>') === -1;
  if (alreadyWrapped) return s;
  const neutralised = s.replace(/<\/user_data>/g, '</user_data_>');
  return `<user_data>${neutralised}</user_data>`;
}

export interface RedactOptions {
  /** Return `true` to skip wrapping for a given object key. Only invoked for
   *  string values on object entries — not for array elements or scalar
   *  roots. Use to keep ids / slugs / dates literal. */
  skip?: (key: string) => boolean;
}

/**
 * Recursively walks `value` and returns a deep-copied structure where every
 * string leaf has been passed through `wrapUserData`. Pass `skip` to exclude
 * specific keys (e.g. `id`) from wrapping.
 */
export function redactNestedStrings<T>(value: T, opts?: RedactOptions): T {
  return walk(value, opts) as T;
}

function walk(value: unknown, opts?: RedactOptions): unknown {
  if (typeof value === 'string') return wrapUserData(value);
  if (Array.isArray(value)) return value.map((v) => walk(v, opts));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (opts?.skip?.(k) && typeof v === 'string') {
        out[k] = v;
      } else {
        out[k] = walk(v, opts);
      }
    }
    return out;
  }
  return value;
}
