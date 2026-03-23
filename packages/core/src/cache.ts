import type { Cache, CacheRule } from './types/cache';
import type { Store } from './types';
import type { CompiledMatcher } from './types/matcher';
import { compileMatcher } from './matcher';
import { getByPath, setByPath } from './byPath';
import { getMappingValue } from './mapping';

interface CompiledCacheRule {
  match: CompiledMatcher;
  key: string[];
  ttl: number;
  update?: CacheRule['update'];
}

export interface CompiledCache {
  full: boolean;
  storeId?: string;
  rules: CompiledCacheRule[];
}

export interface CacheResult {
  status: 'HIT' | 'MISS';
  key: string;
  value?: unknown;
  rule: CompiledCacheRule;
}

export function compileCache(cache: Cache): CompiledCache {
  return {
    full: cache.full ?? false,
    storeId: cache.store,
    rules: cache.rules.map((rule) => ({
      match: compileMatcher(rule.match),
      key: rule.key,
      ttl: rule.ttl,
      update: rule.update,
    })),
  };
}

export function checkCache(
  compiled: CompiledCache,
  store: Store.Instance,
  context: Record<string, unknown>,
  namespace: string,
): CacheResult | null {
  const rule = compiled.rules.find((r) => r.match(context));
  if (!rule) return null;

  const keyParts = rule.key.map((field) =>
    String(getByPath(context, field) ?? ''),
  );

  if (keyParts.every((p) => p === '')) return null;

  const keyValue = keyParts.join(':');
  const namespacedKey = `${namespace}:${keyValue}`;

  const cached = store.get(namespacedKey);

  if (cached !== undefined) {
    return { status: 'HIT', key: namespacedKey, value: cached, rule };
  }

  return { status: 'MISS', key: namespacedKey, rule };
}

export function storeCache(
  store: Store.Instance,
  key: string,
  value: unknown,
  ttlSeconds: number,
): void {
  store.set(key, value, ttlSeconds * 1000);
}

export async function applyUpdate(
  value: unknown,
  update: Record<string, unknown> | undefined,
  context: Record<string, unknown>,
): Promise<unknown> {
  if (!update) return value;

  let result = value;
  for (const [path, valueConfig] of Object.entries(update)) {
    const resolved = await getMappingValue(context, valueConfig);
    result = setByPath(result, path, resolved);
  }
  return result;
}
