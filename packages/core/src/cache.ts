import type { Cache, EventCacheRule } from './types/cache';
import type { Collector, Mapping, Store } from './types';
import type { CompiledMatcher } from './types/matcher';
import { compileMatcher } from './matcher';
import { getByPath, setByPath } from './byPath';
import { getMappingValue } from './mapping';

interface CompiledCacheRule {
  match: CompiledMatcher;
  key: string[];
  ttl: number;
  update?: EventCacheRule['update'];
}

export interface CompiledCache {
  stop: boolean;
  storeId?: string;
  namespace?: string;
  rules: CompiledCacheRule[];
}

export interface CacheResult {
  status: 'HIT' | 'MISS';
  key: string;
  value?: unknown;
  rule: CompiledCacheRule;
}

/**
 * Builds a structured context object for cache and routing operations.
 * Normalizes ingest (defaulting to {}) and optionally includes event.
 */
export function buildCacheContext(
  ingest?: unknown,
  event?: unknown,
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    ingest: (ingest ?? {}) as Record<string, unknown>,
  };
  if (event !== undefined) {
    ctx.event = event as Record<string, unknown>;
  }
  return ctx;
}

export function compileCache(cache: Cache<EventCacheRule>): CompiledCache {
  return {
    stop: cache.stop ?? false,
    storeId: cache.store,
    namespace: cache.namespace,
    rules: cache.rules.map((rule) => ({
      match: rule.match ? compileMatcher(rule.match) : () => true,
      key: rule.key,
      ttl: rule.ttl,
      update: rule.update,
    })),
  };
}

export async function checkCache(
  compiled: CompiledCache,
  store: Store.Instance,
  context: Record<string, unknown>,
  namespace?: string,
): Promise<CacheResult | null> {
  const rule = compiled.rules.find((r) => r.match(context));
  if (!rule) return null;

  const keyParts = rule.key.map((field) =>
    String(getByPath(context, field) ?? ''),
  );

  if (keyParts.every((p) => p === '')) return null;

  const keyValue = keyParts.join(':');
  const ns = namespace ?? compiled.namespace;
  const namespacedKey = ns ? `${ns}:${keyValue}` : keyValue;

  // `Store.GetFn` permits sync or async returns (`T | undefined |
  // Promise<T | undefined>`). Always await so a Promise return from an
  // async store (Redis, fs, the cache wrapper) never lands in the HIT
  // path as the cached "value".
  const decoded = decodeCacheValue(await store.get(namespacedKey));

  if (decoded === undefined)
    return { status: 'MISS', key: namespacedKey, rule };
  if ('expired' in decoded) {
    try {
      await store.delete(namespacedKey);
    } catch {
      /* best-effort purge; degrade to MISS rather than throw into the request */
    }
    return { status: 'MISS', key: namespacedKey, rule };
  }
  return { status: 'HIT', key: namespacedKey, value: decoded.value, rule };
}

export function storeCache(
  store: Store.Instance,
  key: string,
  value: unknown,
  ttlSeconds: number,
): void {
  // exp inside the value = uniform expiry for stores that ignore the ttl arg (fs/s3/gcs); the ttl arg lets honoring stores (in-memory) evict instead of retaining until read.
  // `Store.SetFn` returns `void | Promise<void>`. The write is fire-and-forget
  // (the HTTP response is sent before it lands), so an async store that rejects
  // (network error, EACCES) would otherwise surface as an unhandled rejection
  // and crash the process. Swallow it: a failed cache persist must never crash
  // the request path. Matches the best-effort silent catch on the checkCache purge.
  const result = store.set(
    key,
    encodeCacheValue(value, ttlSeconds * 1000),
    ttlSeconds * 1000,
  );
  if (result instanceof Promise) result.catch(() => {});
}

// --- Cache value codec -------------------------------------------------------
// Serializes a cached value (HTTP RespondOptions, sentinels, events, results)
// to a Buffer so any byte/string store can persist it, and restores it on read.
// Buffer fields are tagged base64 behind a reserved marker; user objects that
// happen to carry the marker are escaped, so NO payload can be corrupted. An
// `exp` timestamp gives every backend uniform TTL even when the store ignores
// the ttl argument. Envelope keys are namespaced so a user object with a literal
// `__walkeros_cache_v__` key is never mistaken for an envelope.

const CACHE_MARKER = '__walkeros_cache__';
const ENVELOPE_VALUE = '__walkeros_cache_v__';
const ENVELOPE_EXP = '__walkeros_cache_exp__';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Precondition: cache values are acyclic JSON-shaped data (RespondOptions /
// events / push results / sentinel); binary leaves are the only non-JSON
// values handled. Node `Buffer`, any `Uint8Array` (e.g. a Fetch-sourced body),
// and a raw `ArrayBuffer` all normalize to the same base64 'buffer' tag and
// therefore all decode back as a Node `Buffer` (see fromSerializable). A
// `Buffer` IS a `Uint8Array`, so the `Buffer.isBuffer` check stays first; the
// `Uint8Array` branch then handles non-Buffer typed-array views by slicing on
// byteOffset/byteLength so a subarray view contributes only its own bytes.
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

function fromSerializable(value: unknown): unknown {
  if (isRecord(value)) {
    if (CACHE_MARKER in value) {
      const tag = value[CACHE_MARKER];
      const data = value.d;
      if (tag === 'buffer' && typeof data === 'string')
        return Buffer.from(data, 'base64');
      if (tag === 'escape' && isRecord(data)) {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) out[k] = fromSerializable(v);
        return out;
      }
      // Unrecognized tag (not 'buffer'/'escape'): fall through to default object
      // traversal so a user object that merely carries the marker key, or a value
      // from a future tag version, is preserved verbatim rather than coerced.
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = fromSerializable(v);
    return out;
  }
  if (Array.isArray(value)) return value.map(fromSerializable);
  return value;
}

export function encodeCacheValue(value: unknown, ttlMs?: number): Buffer {
  const envelope: Record<string, unknown> = {
    [ENVELOPE_VALUE]: toSerializable(value),
  };
  if (ttlMs !== undefined) envelope[ENVELOPE_EXP] = Date.now() + ttlMs;
  return Buffer.from(JSON.stringify(envelope));
}

export function decodeCacheValue(
  raw: unknown,
): { value: unknown } | { expired: true } | undefined {
  if (raw === undefined) return undefined;
  const text = Buffer.isBuffer(raw)
    ? raw.toString('utf8')
    : typeof raw === 'string'
      ? raw
      : undefined;
  if (text === undefined) return { value: raw };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || !(ENVELOPE_VALUE in parsed)) return undefined;
  const exp = parsed[ENVELOPE_EXP];
  if (typeof exp === 'number' && Date.now() > exp) return { expired: true };
  return { value: fromSerializable(parsed[ENVELOPE_VALUE]) };
}

export async function applyUpdate(
  value: unknown,
  update: Record<string, unknown> | undefined,
  context: Record<string, unknown>,
  collector: Collector.Instance,
): Promise<unknown> {
  if (!update) return value;

  let result = value;
  for (const [path, valueConfig] of Object.entries(update)) {
    const resolved = await getMappingValue(
      context,
      valueConfig as Mapping.Data,
      { collector },
    );
    result = setByPath(result, path, resolved);
  }
  return result;
}
