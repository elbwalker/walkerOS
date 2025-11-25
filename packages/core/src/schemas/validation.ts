/**
 * Central validation module
 * Single source of truth for validation library access
 *
 * All schema files should import from this module instead of directly
 * from zod to ensure consistent usage and easy maintenance.
 */

import { z } from 'zod';

// Re-export validation tools for schema files
export { z };
export type { z as zod } from 'zod';

/**
 * Standard JSON Schema conversion with consistent project defaults
 *
 * Uses Zod 4 native toJSONSchema() method for JSON Schema generation.
 * All walkerOS schemas use JSON Schema Draft 7 format.
 *
 * @param schema - Zod schema to convert
 * @param _name - Schema name (ignored in Zod 4, kept for API compatibility)
 * @param target - JSON Schema target version (default: 'draft-7')
 * @returns JSON Schema object
 */
export function toJsonSchema(
  schema: z.ZodTypeAny,
  _name?: string,
  target: 'draft-7' | 'draft-2020-12' | 'openapi-3.0' = 'draft-7',
) {
  return z.toJSONSchema(schema, {
    target,
  });
}
