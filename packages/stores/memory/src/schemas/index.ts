import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';

export { SettingsSchema, type Settings } from './settings';

// JSON Schema for PropertyTable and walkerOS.json
export const settings = zodToSchema(SettingsSchema);
