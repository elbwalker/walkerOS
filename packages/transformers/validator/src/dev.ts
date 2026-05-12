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
      description:
        'Validate full WalkerOS.Event structure. Pre-compiled at init.',
      default: true,
    },
    events: {
      type: 'object',
      description:
        'Entity-action keyed JSON Schemas for event validation. Wildcard fallback: entity.action → entity.* → *.action → *.*. Typically wired from $contract.<name>.events.',
    },
    globals: {
      type: 'object',
      description:
        'JSON Schema for event.globals. Runs on every event. Typically wired from $contract.<name>.globals.',
    },
    context: {
      type: 'object',
      description:
        'JSON Schema for event.context. Runs on every event. Typically wired from $contract.<name>.context.',
    },
    custom: {
      type: 'object',
      description:
        'JSON Schema for event.custom. Runs on every event. Typically wired from $contract.<name>.custom.',
    },
    user: {
      type: 'object',
      description:
        'JSON Schema for event.user. Runs on every event. Typically wired from $contract.<name>.user.',
    },
    consent: {
      type: 'object',
      description:
        'JSON Schema for event.consent. Runs on every event. Typically wired from $contract.<name>.consent.',
    },
  },
};

// Re-export for convenience
export const schemas: { format: JsonSchema; settings: JsonSchema } = {
  format: formatSchema,
  settings: settingsSchema,
};

export * as examples from './examples';
