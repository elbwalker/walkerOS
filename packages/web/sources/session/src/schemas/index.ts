import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';

// Export Zod schemas and types
export { SettingsSchema, type Settings } from './settings';

// JSON Schema exports (for website PropertyTable)
export const settings = zodToSchema(SettingsSchema);
