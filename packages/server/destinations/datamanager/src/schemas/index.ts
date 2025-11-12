export * from './primitives';
export * from './settings';
export * from './mapping';

import { zodToSchema } from '@walkeros/core';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

export const schemas = {
  settings: zodToSchema(SettingsSchema),
  mapping: zodToSchema(MappingSchema),
};
