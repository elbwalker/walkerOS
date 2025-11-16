/**
 * Central validation module
 * Single source of truth for validation library access
 *
 * All schema files should import from this module instead of directly
 * from zod to ensure consistent usage and easy maintenance.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Re-export validation tools for schema files
export { z };
export type { z as zod } from 'zod';
export { zodToJsonSchema };

/**
 * Standard JSON Schema conversion with consistent project defaults
 *
 * Eliminates duplicate configuration blocks across all schema files.
 * All walkerOS schemas use jsonSchema7 format with named definitions.
 *
 * @param schema - Zod schema to convert
 * @param name - Schema name for the JSON Schema definition
 * @param refStrategy - Reference strategy: 'relative' (default), 'root', or 'none'
 * @returns JSON Schema object
 */
export function toJsonSchema(
  schema: z.ZodTypeAny,
  name: string,
  refStrategy: 'relative' | 'root' | 'none' = 'relative',
) {
  return zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    $refStrategy: refStrategy,
    name,
  });
}
