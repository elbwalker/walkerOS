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
 * JSON Schema for Meta Pixel Settings
 * Generated from Zod schema for MCP/Explorer UI compatibility
 */
export const settingsJsonSchema = zodToJsonSchema(SettingsSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'none',
  name: 'MetaPixelSettings',
});

/**
 * JSON Schema for Meta Pixel Mapping
 * Generated from Zod schema for MCP/Explorer UI compatibility
 */
export const mappingJsonSchema = zodToJsonSchema(MappingSchema, {
  target: 'jsonSchema7',
  $refStrategy: 'none',
  name: 'MetaPixelMapping',
});
