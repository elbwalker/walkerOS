import type { MatchExpression } from './matcher';
import type { Value } from './mapping';

export interface CacheRule {
  match: MatchExpression | '*';
  key: string[];
  ttl: number;
  update?: Record<string, Value>;
}

export interface Cache {
  full?: boolean;
  store?: string;
  rules: CacheRule[];
}
