import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

export {
  SettingsSchema,
  type Settings,
  type SnowplowSettings,
} from './settings';
export {
  MappingSchema,
  ContextTypeSchema,
  type Mapping,
  type ContextType,
  type SnowplowMappingSettings,
} from './mapping';

// JSON Schema
export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);
