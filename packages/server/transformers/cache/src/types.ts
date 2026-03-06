import type { Matcher, Store, Transformer } from '@walkeros/core';

export interface CacheEntry {
  body: unknown;
  [key: string]: unknown;
}

export interface CacheEnv extends Transformer.BaseEnv {
  store?: Store.Instance;
}

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

export type Types = Transformer.Types<
  CacheSettings,
  CacheEnv,
  Partial<CacheSettings>
>;
