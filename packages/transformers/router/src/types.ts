import type { Transformer } from '@walkeros/core';

export interface RouterSettings {
  routes?: Route[];
}

export interface Route {
  match: MatchExpression | '*';
  next: Transformer.Next;
}

export type MatchExpression =
  | MatchCondition
  | { and: MatchExpression[] }
  | { or: MatchExpression[] };

export interface MatchCondition {
  key: string;
  operator: MatchOperator;
  value: string;
  not?: boolean;
}

export type MatchOperator =
  | 'eq'
  | 'contains'
  | 'prefix'
  | 'suffix'
  | 'regex'
  | 'gt'
  | 'lt'
  | 'exists';

// Compiled matcher (internal)
export type CompiledMatcher = (ingest: Record<string, unknown>) => boolean;

export interface CompiledRoute {
  match: CompiledMatcher;
  next: Transformer.Next;
}
