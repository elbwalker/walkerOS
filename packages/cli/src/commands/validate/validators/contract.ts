import { isObject } from '@walkeros/core';
import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

const SECTION_KEYS = ['globals', 'context', 'custom', 'user', 'consent'];
const KNOWN_KEYS = new Set([
  'extend',
  'tagging',
  'description',
  'events',
  'schema',
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

  // Check for $-prefixed root keys (flat app shape)
  for (const name of contractNames) {
    if (name.startsWith('$')) {
      errors.push({
        path: name,
        message:
          `"${name}" is not a named contract entry. This looks like the flat ` +
          'shape; use named ContractRule entries, lift $tagging to the rule ' +
          'field "tagging", and nest entity-action schemas under "events".',
        code: 'FLAT_CONTRACT_SHAPE',
      });
    }
  }

  // Check each named contract entry
  for (const [name, entry] of Object.entries(contracts)) {
    // Skip $-prefixed names (already reported above)
    if (name.startsWith('$')) {
      continue;
    }

    if (typeof entry !== 'object' || entry === null) {
      errors.push({
        path: name,
        message: `Contract "${name}" must be an object`,
        code: 'INVALID_CONTRACT_ENTRY',
      });
      continue;
    }

    const obj = entry as Record<string, unknown>;
    const keys = Object.keys(obj);
    const unknownKeys = keys.filter((k) => !KNOWN_KEYS.has(k));
    const hasKnownKey = keys.some((k) => KNOWN_KEYS.has(k));
    const objectValuedUnknown = unknownKeys.filter((k) => isObject(obj[k]));

    // Check for flat entity-action maps (object-valued keys without known keys)
    if (!hasKnownKey && objectValuedUnknown.length > 0) {
      errors.push({
        path: name,
        message:
          `Contract "${name}" looks like a flat entity-action map. Nest ` +
          'entity-action schemas under an "events" key of a named ContractRule.',
        code: 'FLAT_CONTRACT_SHAPE',
      });
      continue;
    }

    // Warn on unknown keys
    for (const key of unknownKeys) {
      warnings.push({
        path: `${name}.${key}`,
        message: `Unknown contract key "${key}" is ignored`,
        code: 'UNKNOWN_CONTRACT_KEY',
      });
    }

    // Validate tagging
    if (obj.tagging !== undefined && typeof obj.tagging !== 'number') {
      errors.push({
        path: `${name}.tagging`,
        message: 'tagging must be a number',
        code: 'INVALID_TAGGING',
      });
    }

    // Validate schema
    if (obj.schema !== undefined && !isObject(obj.schema)) {
      errors.push({
        path: `${name}.schema`,
        message: 'schema must be a JSON Schema object',
        code: 'INVALID_SCHEMA',
      });
    }

    // Validate extend
    if (obj.extend !== undefined) {
      if (typeof obj.extend !== 'string') {
        errors.push({
          path: `${name}.extend`,
          message: 'extend must be a string',
          code: 'INVALID_EXTENDS',
        });
      } else if (!contractNames.includes(obj.extend)) {
        errors.push({
          path: `${name}.extend`,
          message: `extend references non-existent contract "${obj.extend}"`,
          value: obj.extend,
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

  // Check for circular extend
  for (const name of contractNames) {
    const visited = new Set<string>();
    let current = name;
    while (current) {
      if (visited.has(current)) {
        errors.push({
          path: `${name}.extend`,
          message: `Circular extend chain: ${[...visited, current].join(' → ')}`,
          code: 'CIRCULAR_EXTENDS',
        });
        break;
      }
      visited.add(current);
      const entry = contracts[current] as Record<string, unknown> | undefined;
      current = (entry?.extend as string) || '';
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
