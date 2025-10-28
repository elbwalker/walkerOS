import type { RJSFSchema } from '@rjsf/utils';
import type { DestinationSchemas } from '../components/organisms/destination-box';
import { validateValue } from './schema-validation';
import {
  navigateSettingsSchema,
  navigateMappingSettingsSchema,
} from './type-detector';
import { getRulePropertySchema } from '../schemas/rule-properties-schema';

/**
 * Validation error with location information
 */
export interface ValidationError {
  /** Path to the invalid value (e.g., ['settings', 'pixelId']) */
  path: string[];
  /** Human-readable error message */
  error: string;
  /** The invalid value */
  value: unknown;
  /** The schema it failed against */
  schema?: RJSFSchema;
}

/**
 * Get schema for a given path in the config
 *
 * This mirrors the logic from mapping-pane.tsx getSchemaForPath()
 */
function getSchemaForPath(
  path: string[],
  schemas?: DestinationSchemas,
): RJSFSchema | undefined {
  if (!schemas) return undefined;

  // Config-level settings: ['settings', 'pixelId']
  if (path.length >= 2 && path[0] === 'settings' && schemas.settings) {
    return navigateSettingsSchema(path, schemas.settings) || undefined;
  }

  // Rule-level mapping settings: ['mapping', 'product', 'view', 'settings', 'track']
  if (path.includes('settings') && schemas.mapping) {
    return navigateMappingSettingsSchema(path, schemas.mapping) || undefined;
  }

  // Universal rule properties: ['mapping', 'product', 'view', 'name']
  const propertyKey = path[path.length - 1];
  const rulePropertySchema = getRulePropertySchema(propertyKey);
  if (rulePropertySchema) {
    return rulePropertySchema;
  }

  return undefined;
}

/**
 * Recursively validate entire config tree against schemas
 *
 * Scans all values in the config object and validates them against
 * their corresponding schemas. Returns an array of validation errors.
 *
 * @param config - The config object to validate
 * @param schemas - Destination schemas for validation
 * @returns Array of validation errors with path and error message
 *
 * @example
 * const errors = validateConfig(config, schemas);
 * // [
 * //   { path: ['settings', 'pixelId'], error: 'Must match pattern...', value: 'abc' },
 * //   { path: ['mapping', 'page', 'view', 'batch'], error: 'Must be a valid number', value: 'xyz' }
 * // ]
 */
export function validateConfig(
  config: Record<string, unknown>,
  schemas?: DestinationSchemas,
): ValidationError[] {
  const errors: ValidationError[] = [];

  function traverse(obj: unknown, currentPath: string[]) {
    // Skip null/undefined
    if (obj === null || obj === undefined) {
      return;
    }

    // Get schema for current path
    const schema = getSchemaForPath(currentPath, schemas);

    // If we have a schema, validate the current value
    if (schema && currentPath.length > 0) {
      const validationResult = validateValue(obj, schema);
      if (!validationResult.valid && validationResult.error) {
        errors.push({
          path: [...currentPath],
          error: validationResult.error,
          value: obj,
          schema,
        });
      }
    }

    // Recurse into objects
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const record = obj as Record<string, unknown>;
      Object.keys(record).forEach((key) => {
        traverse(record[key], [...currentPath, key]);
      });
    }

    // Recurse into arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        traverse(item, [...currentPath, String(index)]);
      });
    }
  }

  // Start traversal from root
  Object.keys(config).forEach((key) => {
    traverse(config[key], [key]);
  });

  return errors;
}

/**
 * Get a human-readable label for a config path
 *
 * Converts ['settings', 'pixelId'] to 'settings.pixelId'
 */
export function formatPath(path: string[]): string {
  return path.join('.');
}

/**
 * Group validation errors by top-level section
 *
 * @param errors - Array of validation errors
 * @returns Map of section name to errors in that section
 *
 * @example
 * const grouped = groupErrorsBySection(errors);
 * // {
 * //   'settings': [{ path: ['settings', 'pixelId'], ... }],
 * //   'mapping': [{ path: ['mapping', 'page', 'view', 'batch'], ... }]
 * // }
 */
export function groupErrorsBySection(
  errors: ValidationError[],
): Record<string, ValidationError[]> {
  const grouped: Record<string, ValidationError[]> = {};

  errors.forEach((error) => {
    const section = error.path[0] || 'other';
    if (!grouped[section]) {
      grouped[section] = [];
    }
    grouped[section].push(error);
  });

  return grouped;
}
