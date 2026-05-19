import { zodToSchema } from '@walkeros/core/dev';
import { MappingSchema } from './mapping';
import { SettingsSchema } from './settings';

export { MappingSchema, type Mapping } from './mapping';
export { SettingsSchema, type Settings } from './settings';

export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);
