import { zodToSchema } from '@walkeros/core/dev';
import { SettingsInputSchema } from './settings';

export * from './primitives';
export { SettingsInputSchema, SettingsSchema, type Settings } from './settings';
export * from './event';

// JSON Schema
export const settings = zodToSchema(SettingsInputSchema);
