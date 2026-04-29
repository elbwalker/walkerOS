import type { JsonSchema } from './types';

/**
 * Pre-compiled JSON Schema for WalkerOS.Event structure validation.
 * Validates that all required fields exist with correct types.
 */
export const formatSchema: JsonSchema = {
  type: 'object',
  required: [
    'name',
    'entity',
    'action',
    'data',
    'globals',
    'custom',
    'user',
    'consent',
    'id',
    'trigger',
    'timestamp',
    'timing',
    'source',
  ],
  properties: {
    name: { type: 'string', pattern: '^\\S+ \\S+$' }, // "entity action"
    entity: { type: 'string' },
    action: { type: 'string' },
    data: { type: 'object' },
    context: { type: 'object' },
    globals: { type: 'object' },
    custom: { type: 'object' },
    user: { type: 'object' },
    nested: { type: 'array' },
    consent: { type: 'object' },
    id: { type: 'string' },
    trigger: { type: 'string' },
    timestamp: { type: 'number' },
    timing: { type: 'number' },
    source: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string' },
        platform: { type: 'string' },
        url: { type: 'string' },
        referrer: { type: 'string' },
        schema: { type: 'string' },
        version: { type: 'string' },
        count: { type: 'number' },
        trace: { type: 'string' },
        tool: { type: 'string' },
        command: { type: 'string' },
      },
    },
  },
};
