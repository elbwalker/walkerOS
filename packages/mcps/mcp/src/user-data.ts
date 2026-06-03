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

/**
 * The single redaction rule for every tool that echoes flow/deployment data
 * back to the chat assistant:
 *
 *   wrap only the human-facing display `name`/`flowName` field and deep config
 *   VALUES; leave all structural ids/keys literal everywhere.
 *
 * Redaction exists to neutralise user-CONTROLLED string VALUES so an injected
 * `</user_data>` can't escape the envelope. It must NOT touch:
 *   - structural keys (ids, slugs, dates, immutable identifiers): the LLM needs
 *     to reference them verbatim, and wrapping them breaks get→edit→update
 *     round-trips (e.g. wrapping `package`/`platform` corrupts a config the
 *     user pushes straight back).
 *   - tool-generated text (validation messages, error strings): that text is
 *     authored by us, not echoed user input, so it stays literal like `path`.
 *
 * `STRUCTURAL_KEYS` is the union of every key whose value is an id/slug/date/
 * immutable identifier rather than user free-text. Confirmed: none of these key
 * names ever hold a genuine user-authored free-text value — `package`/`platform`
 * are enum/package-name fields, `kind` is a discriminator, the rest are
 * server-generated ids/timestamps.
 */
export const STRUCTURAL_KEYS = new Set([
  'id',
  'flowId',
  'projectId',
  'previewId',
  'version',
  'slug',
  'kind',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'package',
  'platform',
]);

/** Return `true` for keys that must stay literal (ids, slugs, dates, package,
 *  platform). Use as the `skip` predicate for {@link redactNestedStrings}. */
export const keepStructural = (key: string): boolean =>
  STRUCTURAL_KEYS.has(key);

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

/** Human-facing display fields wrapped on echoed flow/deployment summaries even
 *  when the rest of the object is left literal. */
const DISPLAY_NAME_KEYS = new Set(['name', 'flowName']);

/**
 * Recursively wraps ONLY the human-facing display `name`/`flowName` fields,
 * leaving every other value (ids, slugs, status, type, dates) literal. Use on
 * tool responses that echo deployment/flow summaries where the only
 * user-authored free-text is the display name.
 */
export function redactDisplayNames<T>(value: T): T {
  return walkDisplay(value) as T;
}

function walkDisplay(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(walkDisplay);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (DISPLAY_NAME_KEYS.has(k) && typeof v === 'string') {
        out[k] = wrapUserData(v);
      } else {
        out[k] = walkDisplay(v);
      }
    }
    return out;
  }
  return value;
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
