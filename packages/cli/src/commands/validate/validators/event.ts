// walkerOS/packages/cli/src/commands/validate/validators/event.ts

import { validateEvent as coreValidateEvent } from '../../../core/event-validation.js';
import type { ValidateResult } from '../types.js';

export function validateEvent(input: unknown): ValidateResult {
  const result = coreValidateEvent(input, 'strict');

  return {
    valid: result.valid,
    type: 'event',
    errors: result.errors,
    warnings: result.warnings,
    details: result.details as Record<string, unknown>,
  };
}
