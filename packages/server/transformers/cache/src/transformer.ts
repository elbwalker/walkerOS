import type { Transformer } from '@walkeros/core';
import { compileMatcher } from '@walkeros/core';
import type { RespondFn, RespondOptions } from '@walkeros/core';
import { createMemoryStore } from '@walkeros/store-memory';
import type {
  CacheSettings,
  CacheRule,
  CacheEntry,
  CacheEnv,
  Types,
} from './types';

interface CompiledRule {
  matcher: (ingest: Record<string, unknown>) => boolean;
  key: string[];
  ttl: number;
  headers?: Record<string, string>;
}

export const transformerCache: Transformer.Init<Types> = (context) => {
  const { config } = context;
  const settings = (config.settings || {}) as Partial<CacheSettings>;
  const rules: CacheRule[] = settings.rules || [];
  const maxSize = settings.maxSize;

  const store =
    (context.env as CacheEnv).store ??
    createMemoryStore<CacheEntry>({ maxSize });

  // Pre-compile matchers
  const compiledRules: CompiledRule[] = rules.map((rule) => ({
    matcher: compileMatcher(rule.match),
    key: rule.key,
    ttl: rule.ttl,
    headers: rule.headers,
  }));

  return {
    type: 'cache',
    config: config as Transformer.Config<Types>,

    push(event, context) {
      const { logger } = context;
      const ingest = (context.ingest || {}) as Record<string, unknown>;
      const envRespond = context.env.respond as RespondFn | undefined;

      // Find first matching rule
      const rule = compiledRules.find((r) => r.matcher(ingest));
      if (!rule) return; // No match = passthrough

      // Build cache key from ingest fields
      const keyParts = rule.key.map((field) => String(ingest[field] ?? ''));
      const keyValue = keyParts.join(':');

      if (!keyValue || keyParts.every((p) => p === '')) {
        logger.warn('Cache key is empty, skipping cache');
        return;
      }

      // Check cache
      const cached = store.get(keyValue) as CacheEntry | undefined;

      if (cached) {
        // HIT: respond directly and stop chain
        envRespond?.({
          body: cached.body,
          status: cached.status as number | undefined,
          headers: {
            ...(cached.headers as Record<string, string> | undefined),
            ...rule.headers,
            'X-Cache': 'HIT',
          },
        });
        return false;
      }

      // MISS: wrap respond to intercept and cache
      const wrappedRespond: RespondFn = (options: RespondOptions = {}) => {
        const entry: CacheEntry = {
          body: options.body,
          status: options.status,
          headers: options.headers,
        };
        store.set(keyValue, entry, rule.ttl * 1000); // TTL: seconds → milliseconds

        envRespond?.({
          ...options,
          headers: {
            ...options.headers,
            ...rule.headers,
            'X-Cache': 'MISS',
          },
        });
      };

      return { respond: wrappedRespond };
    },
  };
};
