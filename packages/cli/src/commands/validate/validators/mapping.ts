// walkerOS/packages/cli/src/commands/validate/validators/mapping.ts

import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

export function validateMapping(input: unknown): ValidateResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const details: Record<string, unknown> = {};

  // Must be an object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    errors.push({
      path: 'root',
      message: 'Mapping must be an object with event patterns as keys',
      code: 'INVALID_MAPPING_TYPE',
    });
    return { valid: false, type: 'mapping', errors, warnings, details };
  }

  const mapping = input as Record<string, unknown>;
  const patterns = Object.keys(mapping);
  details.eventPatterns = patterns;
  details.patternCount = patterns.length;

  // Validate each event pattern
  patterns.forEach((pattern, index) => {
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
    if (pattern === '*' && index !== patterns.length - 1) {
      warnings.push({
        path: '*',
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
