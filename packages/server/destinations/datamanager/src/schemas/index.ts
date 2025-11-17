export * from './primitives';
export * from './settings';
export * from './mapping';

import { zodToSchema } from '@walkeros/core';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

import type { JSONSchema } from '@walkeros/core';

export const schemas: Record<string, JSONSchema> = {
  settings: zodToSchema(SettingsSchema),
  mapping: zodToSchema(MappingSchema),
};
