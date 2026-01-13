/**
 * Development exports for processor-validator
 * Used by website documentation and examples
 */
import { formatSchema } from './format-schema';
import type { JsonSchema } from './types';

export { formatSchema };

/**
 * JSON Schema describing ValidatorSettings for documentation.
 */
export const settingsSchema: JsonSchema = {
  type: 'object',
  properties: {
    format: {
      type: 'boolean',
      description:
        'Validate full WalkerOS.Event structure. Pre-compiled at init.',
      default: true,
    },
    contract: {
      type: 'object',
      description:
        'Event-specific validation rules. Entity/action keyed, supports wildcards.',
    },
  },
};

// Re-export for convenience
export const schemas: { format: JsonSchema; settings: JsonSchema } = {
  format: formatSchema,
  settings: settingsSchema,
};
