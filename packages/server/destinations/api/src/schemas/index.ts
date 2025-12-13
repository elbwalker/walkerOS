import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';

export { SettingsSchema, type Settings } from './settings';

// JSON Schema
export const settings = zodToSchema(SettingsSchema);
