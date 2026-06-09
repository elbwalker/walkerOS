import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';

export { SettingsSchema, type Settings } from './settings';
export const settings = zodToSchema(SettingsSchema);
