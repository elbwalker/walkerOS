import type { MatchExpression } from './matcher';
import type { Value } from './mapping';

interface BaseCacheRule {
  /**
   * Optional match expression. Omitted means always-match.
   */
  match?: MatchExpression;
  ttl: number;
}

export interface EventCacheRule extends BaseCacheRule {
  key: string[];
  update?: Record<string, Value>;
}

export interface StoreCacheRule extends BaseCacheRule {
  // intentionally no key (caller provides one) and no update (no event).
}

export type CacheRule = EventCacheRule | StoreCacheRule;

export interface Cache<R extends CacheRule = CacheRule> {
  /**
   * Stop the chain on cache HIT (default: false). When true, skip remaining steps and return cached value.
   */
  stop?: boolean;
  store?: string;
  /**
   * Optional key prefix written to the store. When absent, cache keys are written directly. Same store + same key + same namespace = same cache entry.
   */
  namespace?: string;
  rules: R[];
}
