import type {
  MatchExpression,
  MatchCondition,
  MatchOperator,
  CompiledMatcher,
} from './types';

/**
 * Compiles a match expression into a closure for fast runtime evaluation.
 * Regex patterns are compiled once. Numeric comparisons are parsed once.
 * Runtime evaluation is pure function calls with short-circuit logic.
 */
export function compileMatcher(expr: MatchExpression | '*'): CompiledMatcher {
  if (expr === '*') return () => true;

  if ('and' in expr) {
    const fns = expr.and.map(compileMatcher);
    return (ingest) => fns.every((fn) => fn(ingest));
  }

  if ('or' in expr) {
    const fns = expr.or.map(compileMatcher);
    return (ingest) => fns.some((fn) => fn(ingest));
  }

  // Leaf condition
  return compileCondition(expr);
}

function compileCondition(condition: MatchCondition): CompiledMatcher {
  const { key, operator, value, not } = condition;
  const test = compileOperator(operator, value);

  return (ingest) => {
    const raw = ingest[key];
    const result = test(raw);
    return not ? !result : result;
  };
}

function compileOperator(
  operator: MatchOperator,
  value: string,
): (input: unknown) => boolean {
  switch (operator) {
    case 'eq':
      return (input) => String(input ?? '') === value;
    case 'contains':
      return (input) => String(input ?? '').includes(value);
    case 'prefix':
      return (input) => String(input ?? '').startsWith(value);
    case 'suffix':
      return (input) => String(input ?? '').endsWith(value);
    case 'regex': {
      const re = new RegExp(value);
      return (input) => re.test(String(input ?? ''));
    }
    case 'gt': {
      const num = Number(value);
      return (input) => Number(input) > num;
    }
    case 'lt': {
      const num = Number(value);
      return (input) => Number(input) < num;
    }
    case 'exists':
      return (input) => input !== undefined && input !== null;
  }
}
