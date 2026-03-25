import { schemas } from '@walkeros/core/dev';

const { PartialEventSchema } = schemas;

export type ValidationLevel = 'strict' | 'standard' | 'minimal';

export type EventValidationCode =
  | 'NOT_AN_OBJECT'
  | 'MISSING_EVENT_NAME'
  | 'EMPTY_EVENT_NAME'
  | 'INVALID_EVENT_NAME'
  | 'SCHEMA_VALIDATION';

export interface EventValidationError {
  path: string;
  message: string;
  value?: unknown;
  code: EventValidationCode;
}

export interface EventValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

export interface EventValidationDetails {
  entity?: string | null;
  action?: string | null;
  hasConsent?: boolean;
  hasData?: boolean;
  hasContext?: boolean;
}

export interface EventValidationResult {
  valid: boolean;
  errors: EventValidationError[];
  warnings: EventValidationWarning[];
  details: EventValidationDetails;
}

export function validateEvent(
  input: unknown,
  level: ValidationLevel = 'strict',
): EventValidationResult {
  const errors: EventValidationError[] = [];
  const warnings: EventValidationWarning[] = [];
  const details: EventValidationDetails = {};

  // All levels: must be an object
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    errors.push({
      path: 'root',
      message: 'Event must be an object',
      code: 'NOT_AN_OBJECT',
    });
    return { valid: false, errors, warnings, details };
  }

  const event = input as Record<string, unknown>;

  // All levels: name field checks
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
    // Entity-action format check (strict + standard only)
    const name = event.name;
    if (!name.includes(' ')) {
      if (level === 'strict') {
        errors.push({
          path: 'name',
          message:
            'Event name must be "entity action" format with space (e.g., "page view")',
          value: name,
          code: 'INVALID_EVENT_NAME',
        });
        details.entity = null;
        details.action = null;
      } else if (level === 'standard') {
        warnings.push({
          path: 'name',
          message: `Event name "${name}" should follow "ENTITY ACTION" format (e.g., "page view")`,
        });
        details.entity = null;
        details.action = null;
      }
      // minimal: skip entirely
    } else {
      const parts = name.trim().split(/\s+/);
      const action = parts.pop()!;
      const entity = parts.join(' ');
      details.entity = entity;
      details.action = action;
    }
  }

  // Minimal stops here
  if (level === 'minimal') {
    return { valid: errors.length === 0, errors, warnings, details };
  }

  // Standard + Strict: Zod schema validation
  const zodResult = PartialEventSchema.safeParse(input);
  if (!zodResult.success) {
    for (const issue of zodResult.error.issues) {
      const issuePath = issue.path.join('.');
      if (issuePath === 'name') continue; // handled above with better messages
      errors.push({
        path: issuePath || 'root',
        message: issue.message,
        code: 'SCHEMA_VALIDATION',
      });
    }
  }

  // Strict only: consent warning + details
  if (level === 'strict') {
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
  }

  return { valid: errors.length === 0, errors, warnings, details };
}
