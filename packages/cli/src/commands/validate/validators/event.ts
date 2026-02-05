// walkerOS/packages/cli/src/commands/validate/validators/event.ts

import { schemas } from '@walkeros/core/dev';
import type {
  ValidateResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

const { PartialEventSchema } = schemas;

export function validateEvent(input: unknown): ValidateResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const details: Record<string, unknown> = {};

  // Type guard for object access
  const event = (
    typeof input === 'object' && input !== null ? input : {}
  ) as Record<string, unknown>;

  // 1. Check for name field existence
  if (!('name' in event) || event.name === undefined) {
    errors.push({
      path: 'name',
      message: 'Event must have a name field',
      code: 'MISSING_EVENT_NAME',
    });
  } else if (typeof event.name !== 'string' || event.name.trim() === '') {
    errors.push({
      path: 'name',
      message: 'Event name cannot be empty',
      value: event.name,
      code: 'EMPTY_EVENT_NAME',
    });
  } else {
    // 2. Validate entity-action format (must contain space)
    const name = event.name as string;
    if (!name.includes(' ')) {
      errors.push({
        path: 'name',
        message:
          'Event name must be "entity action" format with space (e.g., "page view")',
        value: name,
        code: 'INVALID_EVENT_NAME',
      });
      details.entity = null;
      details.action = null;
    } else {
      // Extract entity and action (last word is action, rest is entity)
      const parts = name.split(' ');
      const action = parts.pop()!;
      const entity = parts.join(' ');
      details.entity = entity;
      details.action = action;
    }
  }

  // 3. Validate against Zod schema for structural validation
  const zodResult = PartialEventSchema.safeParse(input);
  if (!zodResult.success) {
    for (const issue of zodResult.error.issues) {
      const path = issue.path.join('.');
      // Skip name errors (we handle those above with better messages)
      if (path === 'name') continue;

      errors.push({
        path: path || 'root',
        message: issue.message,
        code: 'SCHEMA_VALIDATION',
      });
    }
  }

  // 4. Warnings for best practices
  if (!event.consent) {
    warnings.push({
      path: 'consent',
      message: 'No consent object provided',
      suggestion:
        'Consider adding a consent object for GDPR/privacy compliance',
    });
  }

  details.hasConsent = !!event.consent;
  details.hasData = !!event.data;
  details.hasContext = !!event.context;

  return {
    valid: errors.length === 0,
    type: 'event',
    errors,
    warnings,
    details,
  };
}
