import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema, FirehoseConfigSchema } from './settings';
import { MappingSchema } from './mapping';

export {
  SettingsSchema,
  type Settings,
  FirehoseConfigSchema,
} from './settings';
export { MappingSchema, type Mapping } from './mapping';

// JSON Schema
export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);

// Nested JSON Schema for Firehose subpage
export const firehose = zodToSchema(FirehoseConfigSchema);
