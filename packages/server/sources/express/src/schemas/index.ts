import { zodToSchema } from '@walkeros/core/dev';
import { SettingsInputSchema } from './settings';

export * from './primitives';
export { SettingsInputSchema, SettingsSchema, type Settings } from './settings';

// JSON Schema
export const settings = zodToSchema(SettingsInputSchema);
