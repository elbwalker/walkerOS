/**
 * Development exports for transformer-validator
 * Used by website documentation and examples
 */
import { formatSchema } from './format-schema';
import type { JsonSchema } from './types';

export { formatSchema };

/**
 * JSON Schema describing ValidatorSettings for documentation.
 * Mirrors the ValidatorSettings interface in src/types.ts.
 */
export const settingsSchema: JsonSchema = {
  type: 'object',
  properties: {
    format: {
      type: 'boolean',
      description: 'Validate full WalkerOS.Event structure.',
      default: true,
    },
    events: {
      type: 'object',
      description:
        'Entity-action keyed JSON Schemas. Wildcard fallback: entity.action → entity.* → *.action → *.*.',
    },
    schema: {
      type: 'object',
      description: 'JSON Schema run against the full input.',
    },
  },
};

// Re-export for convenience
export const schemas: { format: JsonSchema; settings: JsonSchema } = {
  format: formatSchema,
  settings: settingsSchema,
};

export * as examples from './examples';
