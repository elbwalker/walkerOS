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
    'context',
    'globals',
    'custom',
    'user',
    'nested',
    'consent',
    'id',
    'trigger',
    'timestamp',
    'timing',
    'group',
    'count',
    'version',
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
    group: { type: 'string' },
    count: { type: 'number' },
    version: {
      type: 'object',
      required: ['source', 'tagging'],
      properties: {
        source: { type: 'string' },
        tagging: { type: 'number' },
      },
    },
    source: {
      type: 'object',
      required: ['type', 'id', 'previous_id'],
      properties: {
        type: { type: 'string' },
        id: { type: 'string' },
        previous_id: { type: 'string' },
      },
    },
  },
};
