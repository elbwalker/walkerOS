// walkerOS/packages/cli/src/commands/validate/validators/mapping.ts

import { isObject } from '@walkeros/core';
import { schemas } from '@walkeros/core/dev';
import type {
  ValidateDetails,
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

const { RuleSchema } = schemas.MappingSchemas;

function isRule(value: unknown): boolean {
  return isObject(value) && RuleSchema.safeParse(value).success;
}

/**
 * The nested runtime shape: an entity key whose value maps actions to a rule
 * or a list of rules (`{ page: { view: { name: 'page_view' } } }`).
 */
function isNestedActions(
  key: string,
  value: unknown,
): value is Record<string, unknown> {
  if (key.includes(' ') || !isObject(value)) return false;
  const rules = Object.values(value);
  return (
    rules.length > 0 &&
    rules.every((rule) =>
      Array.isArray(rule)
        ? rule.length > 0 && rule.every(isRule)
        : isRule(rule),
    )
  );
}

export function validateMapping(input: unknown): ValidateResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const details: ValidateDetails = {};

  // Must be an object
  if (!isObject(input)) {
    errors.push({
      path: 'root',
      message: 'Mapping must be an object with event patterns as keys',
      code: 'INVALID_MAPPING_TYPE',
    });
    return { valid: false, type: 'mapping', errors, warnings, details };
  }

  const mapping = input;
  const nestedPatterns: string[] = [];
  const flatPatterns: string[] = [];
  for (const [key, value] of Object.entries(mapping)) {
    if (isNestedActions(key, value)) {
      for (const action of Object.keys(value))
        nestedPatterns.push(`${key} ${action}`);
    } else {
      flatPatterns.push(key);
    }
  }
  const patterns = [...nestedPatterns, ...flatPatterns];
  details.eventPatterns = patterns;
  details.patternCount = patterns.length;

  // Validate each flat "entity action" pattern (legacy flat shape)
  flatPatterns.forEach((pattern, index) => {
    // Check pattern format: must be "entity action", contain wildcard, or be "*"
    const isWildcard = pattern.includes('*');
    const hasSpace = pattern.includes(' ');

    if (!isWildcard && !hasSpace) {
      errors.push({
        path: pattern,
        message: `Invalid event pattern "${pattern}". Must be "entity action" format or contain wildcard (*)`,
        code: 'INVALID_EVENT_PATTERN',
      });
    }

    // Warn if catch-all is not last
    if (pattern === '*' && index !== flatPatterns.length - 1) {
      warnings.push({
        path: '*',
        code: 'CATCH_ALL_NOT_LAST',
        message: 'Catch-all pattern (*) should be last',
        suggestion:
          'Move the catch-all pattern (*) to last position for predictable matching',
      });
    }

    // Validate rule structure (accepts single rule object or array of rules)
    const rule = mapping[pattern];
    const isValidRule = Array.isArray(rule)
      ? rule.every((r) => typeof r === 'object' && r !== null)
      : typeof rule === 'object' && rule !== null;

    if (!isValidRule) {
      errors.push({
        path: pattern,
        message: 'Mapping rule must be an object or array of objects',
        code: 'INVALID_RULE_TYPE',
      });
    }
  });

  return {
    valid: errors.length === 0,
    type: 'mapping',
    errors,
    warnings,
    details,
  };
}
