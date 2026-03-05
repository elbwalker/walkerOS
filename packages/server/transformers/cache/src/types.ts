import type { Matcher } from '@walkeros/core';

export interface CacheSettings {
  maxSize?: number; // default: 10MB
  rules: CacheRule[];
}

export interface CacheRule {
  match: Matcher.MatchExpression | '*';
  key: string[];
  ttl: number;
  headers?: Record<string, string>;
}
