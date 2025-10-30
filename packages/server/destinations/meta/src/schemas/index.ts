import { zodToJsonSchema } from '@walkeros/core';

// Export primitives
export * from './primitives';

// Export schemas
export { SettingsSchema, type Settings } from './settings';
export { MappingSchema, type Mapping } from './mapping';

// Import for JSON Schema generation
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

/**
 * JSON Schema for Meta CAPI Settings
 * Generated from Zod schema for MCP/Explorer UI compatibility
 */
export const settingsJsonSchema = zodToJsonSchema(SettingsSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'none',
  name: 'MetaCAPISettings',
});

/**
 * JSON Schema for Meta CAPI Mapping
 * Generated from Zod schema for MCP/Explorer UI compatibility
 */
export const mappingJsonSchema = zodToJsonSchema(MappingSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'none',
  name: 'MetaCAPIMapping',
});
