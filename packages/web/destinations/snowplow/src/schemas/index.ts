import { zodToSchema } from '@walkeros/core/dev';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';

export {
  SettingsSchema,
  TrackerContextsSchema,
  UrlBasedPluginSchema,
  ActivityTrackingSchema,
  type Settings,
  type SnowplowSettings,
  type TrackerContexts,
  type UrlBasedPlugin,
  type ActivityTracking,
} from './settings';
export {
  MappingSchema,
  type Mapping,
  type SnowplowMappingSettings,
} from './mapping';

// JSON Schema
export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);
