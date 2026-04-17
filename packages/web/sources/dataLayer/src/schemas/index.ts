import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

// Export primitives
export * from './primitives';

// Export Zod schemas and types
export { SettingsSchema, type Settings } from './settings';
export { MappingSchema, type Mapping } from './mapping';

// JSON Schema exports (for website PropertyTable and documentation tools)
export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);
