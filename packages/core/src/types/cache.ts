import type { MatchExpression } from './matcher';
import type { Value } from './mapping';

export interface CacheRule {
  /**
   * Optional match expression. Omitted means always-match.
   */
  match?: MatchExpression;
  key: string[];
  ttl: number;
  update?: Record<string, Value>;
}

export interface Cache {
  /**
   * Stop the chain on cache HIT (default: false). When true, skip remaining steps and return cached value.
   */
  stop?: boolean;
  store?: string;
  /**
   * Optional key prefix written to the store. When absent, cache keys are written directly. Same store + same key + same namespace = same cache entry.
   */
  namespace?: string;
  rules: CacheRule[];
}
