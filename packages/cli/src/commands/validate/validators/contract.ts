import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

const SECTION_KEYS = ['globals', 'context', 'custom', 'user', 'consent'];
const KNOWN_KEYS = new Set([
  'extends',
  'description',
  'events',
  ...SECTION_KEYS,
]);

export function validateContract(input: unknown): ValidateResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const details: Record<string, unknown> = {};

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    errors.push({
      path: 'root',
      message: 'Contract must be an object of named contract entries',
      code: 'INVALID_CONTRACT',
    });
    return { valid: false, type: 'contract', errors, warnings, details };
  }

  const contracts = input as Record<string, unknown>;
  const contractNames = Object.keys(contracts);
  details.contractCount = contractNames.length;

  // Check each named contract entry
  for (const [name, entry] of Object.entries(contracts)) {
    if (typeof entry !== 'object' || entry === null) {
      errors.push({
        path: name,
        message: `Contract "${name}" must be an object`,
        code: 'INVALID_CONTRACT_ENTRY',
      });
      continue;
    }

    const obj = entry as Record<string, unknown>;

    // Validate extends
    if (obj.extends !== undefined) {
      if (typeof obj.extends !== 'string') {
        errors.push({
          path: `${name}.extends`,
          message: 'extends must be a string',
          code: 'INVALID_EXTENDS',
        });
      } else if (!contractNames.includes(obj.extends)) {
        errors.push({
          path: `${name}.extends`,
          message: `extends references non-existent contract "${obj.extends}"`,
          value: obj.extends,
          code: 'INVALID_EXTENDS',
        });
      }
    }

    // Validate sections
    for (const key of SECTION_KEYS) {
      if (key in obj) {
        if (typeof obj[key] !== 'object' || obj[key] === null) {
          errors.push({
            path: `${name}.${key}`,
            message: `Section "${key}" must be a JSON Schema object`,
            value: obj[key],
            code: 'INVALID_SECTION',
          });
        }
      }
    }

    // Validate events
    if (obj.events !== undefined) {
      if (typeof obj.events !== 'object' || obj.events === null) {
        errors.push({
          path: `${name}.events`,
          message: 'events must be an object',
          code: 'INVALID_EVENTS',
        });
      } else {
        validateEntityActions(
          obj.events as Record<string, unknown>,
          `${name}.events`,
          errors,
        );
      }
    }
  }

  // Check for circular extends
  for (const name of contractNames) {
    const visited = new Set<string>();
    let current = name;
    while (current) {
      if (visited.has(current)) {
        errors.push({
          path: `${name}.extends`,
          message: `Circular extends chain: ${[...visited, current].join(' → ')}`,
          code: 'CIRCULAR_EXTENDS',
        });
        break;
      }
      visited.add(current);
      const entry = contracts[current] as Record<string, unknown> | undefined;
      current = (entry?.extends as string) || '';
    }
  }

  return {
    valid: errors.length === 0,
    type: 'contract',
    errors,
    warnings,
    details,
  };
}

function validateEntityActions(
  obj: Record<string, unknown>,
  prefix: string,
  errors: ValidationError[],
): void {
  for (const [entityKey, entityValue] of Object.entries(obj)) {
    if (entityKey.trim() === '') {
      errors.push({
        path: `${prefix}.${entityKey}`,
        message: 'Entity key cannot be empty',
        code: 'INVALID_ENTITY_KEY',
      });
      continue;
    }

    if (typeof entityValue !== 'object' || entityValue === null) {
      errors.push({
        path: `${prefix}.${entityKey}`,
        message: `Entity "${entityKey}" must be an object`,
        value: entityValue,
        code: 'INVALID_ENTITY',
      });
      continue;
    }

    for (const [actionKey, actionValue] of Object.entries(
      entityValue as Record<string, unknown>,
    )) {
      if (actionKey.trim() === '') {
        errors.push({
          path: `${prefix}.${entityKey}.${actionKey}`,
          message: 'Action key cannot be empty',
          code: 'INVALID_ACTION_KEY',
        });
        continue;
      }

      if (
        typeof actionValue !== 'object' ||
        actionValue === null ||
        Array.isArray(actionValue)
      ) {
        errors.push({
          path: `${prefix}.${entityKey}.${actionKey}`,
          message: 'Contract entry must be a JSON Schema object',
          value: typeof actionValue,
          code: 'INVALID_SCHEMA_ENTRY',
        });
      }
    }
  }
}
