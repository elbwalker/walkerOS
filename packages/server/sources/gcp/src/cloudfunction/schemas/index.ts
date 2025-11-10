import { zodToSchema } from '@walkeros/core';
import { SettingsSchema } from './settings';

// Export primitives
export * from './primitives';

// Export Zod schemas and types
export { SettingsSchema, type Settings } from './settings';

// JSON Schema exports (for website PropertyTable and documentation tools)
export const settings = zodToSchema(SettingsSchema);
