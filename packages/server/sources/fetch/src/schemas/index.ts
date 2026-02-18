import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';

export * from './primitives';
export { SettingsSchema, type Settings } from './settings';
export * from './event';

// JSON Schema
export const settings = zodToSchema(SettingsSchema);
