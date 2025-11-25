export * from './primitives';
export * from './settings';
export * from './mapping';

import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);
