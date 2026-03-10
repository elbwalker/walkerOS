import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

const SECTION_KEYS = ['globals', 'context', 'custom', 'user', 'consent'];
const META_KEYS = [
  'version',
  '$tagging',
  'description',
  'events',
  ...SECTION_KEYS,
];

export function validateContract(input: unknown): ValidateResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const details: Record<string, unknown> = {};

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    errors.push({
      path: 'root',
      message: 'Contract must be an object',
      code: 'INVALID_CONTRACT',
    });
    return { valid: false, type: 'contract', errors, warnings, details };
  }

  const contract = input as Record<string, unknown>;
  const isV2 = contract.version === 2;

  // Validate $tagging if present
  if ('$tagging' in contract) {
    const tagging = contract.$tagging;
    if (
      typeof tagging !== 'number' ||
      !Number.isInteger(tagging) ||
      tagging < 0
    ) {
      errors.push({
        path: '$tagging',
        message: '$tagging must be a non-negative integer',
        value: tagging,
        code: 'INVALID_TAGGING',
      });
    } else {
      details.tagging = tagging;
    }
  }

  if (isV2) {
    // v2: validate sections
    const sections: string[] = [];
    for (const key of SECTION_KEYS) {
      if (key in contract) {
        if (typeof contract[key] !== 'object' || contract[key] === null) {
          errors.push({
            path: key,
            message: `Section "${key}" must be a JSON Schema object`,
            value: contract[key],
            code: 'INVALID_SECTION',
          });
        } else {
          sections.push(key);
        }
      }
    }
    details.sections = sections;

    // v2: validate events section
    const events = contract.events;
    if (events && typeof events === 'object') {
      const { entityCount, actionCount } = validateEntityActions(
        events as Record<string, unknown>,
        'events',
        errors,
      );
      details.entityCount = entityCount;
      details.actionCount = actionCount;
    } else if (events !== undefined) {
      errors.push({
        path: 'events',
        message: 'events must be an object',
        code: 'INVALID_EVENTS',
      });
    } else {
      details.entityCount = 0;
      details.actionCount = 0;
    }
  } else {
    // Legacy: validate flat entity-action entries
    const { entityCount, actionCount } = validateEntityActions(
      contract,
      '',
      errors,
    );
    details.entityCount = entityCount;
    details.actionCount = actionCount;
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
): { entityCount: number; actionCount: number } {
  let entityCount = 0;
  let actionCount = 0;

  for (const [entityKey, entityValue] of Object.entries(obj)) {
    // Skip metadata keys
    if (entityKey.startsWith('$')) continue;
    if (META_KEYS.includes(entityKey)) continue;

    if (entityKey.trim() === '') {
      errors.push({
        path: prefix ? `${prefix}.${entityKey}` : entityKey,
        message: 'Entity key cannot be empty',
        code: 'INVALID_ENTITY_KEY',
      });
      continue;
    }

    if (typeof entityValue !== 'object' || entityValue === null) {
      errors.push({
        path: prefix ? `${prefix}.${entityKey}` : entityKey,
        message: `Entity "${entityKey}" must be an object of action entries`,
        value: entityValue,
        code: 'INVALID_ENTITY',
      });
      continue;
    }

    entityCount++;
    const actions = entityValue as Record<string, unknown>;

    for (const [actionKey, actionValue] of Object.entries(actions)) {
      if (actionKey.trim() === '') {
        errors.push({
          path: prefix
            ? `${prefix}.${entityKey}.${actionKey}`
            : `${entityKey}.${actionKey}`,
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
          path: prefix
            ? `${prefix}.${entityKey}.${actionKey}`
            : `${entityKey}.${actionKey}`,
          message: 'Contract entry must be a JSON Schema object',
          value: typeof actionValue,
          code: 'INVALID_SCHEMA_ENTRY',
        });
        continue;
      }

      actionCount++;
    }
  }

  return { entityCount, actionCount };
}
