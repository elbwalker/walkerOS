import type { Matcher, Transformer } from '@walkeros/core';

// Re-export matcher types from core for backward compatibility
export type MatchExpression = Matcher.MatchExpression;
export type MatchCondition = Matcher.MatchCondition;
export type MatchOperator = Matcher.MatchOperator;
export type CompiledMatcher = Matcher.CompiledMatcher;

export interface RouterSettings {
  routes?: Route[];
}

export interface Route {
  match: MatchExpression | '*';
  next: Transformer.Next;
}

export interface CompiledRoute {
  match: CompiledMatcher;
  next: Transformer.Next;
}
