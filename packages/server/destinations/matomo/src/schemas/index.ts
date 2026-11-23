import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

// Types of record live in ../types; the zod types loosen through core's ValueSchema
export { SettingsSchema } from './settings';
export { MappingSchema } from './mapping';

// JSON Schema
export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);
