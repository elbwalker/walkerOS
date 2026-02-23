import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

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
  let entityCount = 0;
  let actionCount = 0;

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

  // Validate entity-action entries
  for (const [entityKey, entityValue] of Object.entries(contract)) {
    // Skip metadata keys
    if (entityKey.startsWith('$')) continue;

    // Validate entity key
    if (entityKey.trim() === '') {
      errors.push({
        path: entityKey,
        message: 'Entity key cannot be empty',
        code: 'INVALID_ENTITY_KEY',
      });
      continue;
    }

    if (typeof entityValue !== 'object' || entityValue === null) {
      errors.push({
        path: entityKey,
        message: `Entity "${entityKey}" must be an object of action entries`,
        value: entityValue,
        code: 'INVALID_ENTITY',
      });
      continue;
    }

    entityCount++;
    const actions = entityValue as Record<string, unknown>;

    for (const [actionKey, actionValue] of Object.entries(actions)) {
      // Validate action key
      if (actionKey.trim() === '') {
        errors.push({
          path: `${entityKey}.${actionKey}`,
          message: 'Action key cannot be empty',
          code: 'INVALID_ACTION_KEY',
        });
        continue;
      }

      // Validate action value is a JSON Schema object
      if (
        typeof actionValue !== 'object' ||
        actionValue === null ||
        Array.isArray(actionValue)
      ) {
        errors.push({
          path: `${entityKey}.${actionKey}`,
          message: `Contract entry must be a JSON Schema object`,
          value: typeof actionValue,
          code: 'INVALID_SCHEMA_ENTRY',
        });
        continue;
      }

      actionCount++;
    }
  }

  details.entityCount = entityCount;
  details.actionCount = actionCount;

  return {
    valid: errors.length === 0,
    type: 'contract',
    errors,
    warnings,
    details,
  };
}
