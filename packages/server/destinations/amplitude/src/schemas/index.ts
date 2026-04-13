import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

export { SettingsSchema, type Settings } from './settings';
export { MappingSchema, type Mapping } from './mapping';

export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);
