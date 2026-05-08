import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { SetupSchema } from './setup';

export { SettingsSchema, type Settings } from './settings';
export { SetupSchema, type Setup } from './setup';

// JSON Schema exports (for website PropertyTable + MCP package_get).
export const settings = zodToSchema(SettingsSchema);
export const setup = zodToSchema(SetupSchema);
