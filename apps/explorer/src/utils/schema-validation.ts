import type { RJSFSchema } from '@rjsf/utils';

/**
 * Validation result with error message
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a value against a JSON Schema
 *
 * Supports common validation rules:
 * - String: pattern, minLength, maxLength, enum
 * - Number: minimum, maximum, enum
 * - Type checking
 *
 * @param value - Value to validate
 * @param schema - JSON Schema to validate against
 * @returns Validation result with error message if invalid
 *
 * @example
 * const result = validateValue('123abc', {
 *   type: 'string',
 *   pattern: '^[0-9]+$'
 * });
 * // { valid: false, error: 'Must match pattern: ^[0-9]+$' }
 */
export function validateValue(
  value: unknown,
  schema?: RJSFSchema,
): ValidationResult {
  // No schema = no validation
  if (!schema) {
    return { valid: true };
  }

  // Empty/null values - check if required
  if (value === undefined || value === null || value === '') {
    // If schema has a default or is not required, it's valid
    return { valid: true };
  }

  const schemaType = schema.type;

  // String validation
  if (schemaType === 'string') {
    const strValue = String(value);

    // Pattern validation (most important for things like pixelId)
    if (schema.pattern) {
      try {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(strValue)) {
          return {
            valid: false,
            error: `Must match pattern: ${schema.pattern}`,
          };
        }
      } catch (e) {
        // Invalid regex pattern in schema - skip validation
        console.warn('Invalid regex pattern in schema:', schema.pattern);
      }
    }

    // Length validation
    if (schema.minLength !== undefined && strValue.length < schema.minLength) {
      return {
        valid: false,
        error: `Minimum length: ${schema.minLength} characters`,
      };
    }

    if (schema.maxLength !== undefined && strValue.length > schema.maxLength) {
      return {
        valid: false,
        error: `Maximum length: ${schema.maxLength} characters`,
      };
    }

    // Enum validation
    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(strValue)) {
        return {
          valid: false,
          error: `Must be one of: ${schema.enum.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  // Number validation
  if (schemaType === 'number' || schemaType === 'integer') {
    const numValue = typeof value === 'number' ? value : Number(value);

    // Type check
    if (isNaN(numValue)) {
      return {
        valid: false,
        error: 'Must be a valid number',
      };
    }

    // Integer check
    if (schemaType === 'integer' && !Number.isInteger(numValue)) {
      return {
        valid: false,
        error: 'Must be an integer',
      };
    }

    // Range validation
    if (schema.minimum !== undefined && numValue < schema.minimum) {
      return {
        valid: false,
        error: `Minimum value: ${schema.minimum}`,
      };
    }

    if (schema.maximum !== undefined && numValue > schema.maximum) {
      return {
        valid: false,
        error: `Maximum value: ${schema.maximum}`,
      };
    }

    // Enum validation
    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(numValue)) {
        return {
          valid: false,
          error: `Must be one of: ${schema.enum.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  // Boolean validation
  if (schemaType === 'boolean') {
    if (typeof value !== 'boolean') {
      return {
        valid: false,
        error: 'Must be true or false',
      };
    }
    return { valid: true };
  }

  // No validation for other types (array, object, etc.)
  return { valid: true };
}

/**
 * Format validation error message for display
 *
 * @param error - Error message from validation
 * @returns Formatted error message
 */
export function formatValidationError(error: string): string {
  return error;
}
