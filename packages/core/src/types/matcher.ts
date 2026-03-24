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
export type CompiledMatcher = (context: Record<string, unknown>) => boolean;
