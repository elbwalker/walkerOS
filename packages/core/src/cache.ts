import type { Cache, EventCacheRule } from './types/cache';
import type { Collector, Mapping, Store } from './types';
import type { StoreValue } from './types/store';
import type { CompiledMatcher } from './types/matcher';
import { compileMatcher } from './matcher';
import { getByPath, setByPath } from './byPath';
import { getMappingValue } from './mapping';
import { wrapCacheEnvelope, readCacheEnvelope } from './cache-envelope';
import { isStoreValue } from './store/codec';

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
  value?: StoreValue;
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
  const decoded = readCacheEnvelope(await store.get(namespacedKey));

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
  // Callers (source RespondOptions, destination push result, transformer
  // processed event) hold values typed wider than `StoreValue` but that are
  // structurally a `StoreValue` at runtime (JSON-shaped + binary leaves). The
  // guard narrows cast-free; a value that is genuinely not a `StoreValue` is
  // not cacheable, and the cache is advisory, so silently skip rather than
  // throw into the request path.
  if (!isStoreValue(value)) return;

  const ttlMs = ttlSeconds * 1000;
  // Store the plain {value, exp} envelope, not a pre-serialized Buffer: the
  // backing store serializes it through the shared store codec, so binary
  // leaves come back as Uint8Array. `exp` inside the envelope gives
  // uniform expiry for stores that ignore the ttl arg (fs/s3/gcs); the ttl
  // arg lets TTL-native stores (in-memory) evict instead of retaining until
  // read.
  // `Store.SetFn` returns `void | Promise<void>`. The write is fire-and-forget
  // (the HTTP response is sent before it lands), so an async store that rejects
  // (network error, EACCES) would otherwise surface as an unhandled rejection
  // and crash the process. Swallow it: a failed cache persist must never crash
  // the request path. Matches the best-effort silent catch on the checkCache purge.
  const result = store.set(key, wrapCacheEnvelope(value, ttlMs), ttlMs);
  if (result instanceof Promise) result.catch(() => {});
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
