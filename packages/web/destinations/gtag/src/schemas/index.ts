import { zodToSchema } from '@walkeros/core/schemas';
import { SettingsSchema } from './settings';
import { MappingSchema } from './mapping';
import {
  GA4SettingsSchema,
  AdsSettingsSchema,
  GTMSettingsSchema,
} from './primitives';

export * from './primitives';

export { SettingsSchema, type Settings } from './settings';
export { MappingSchema, type Mapping } from './mapping';

// JSON Schema
export const settings = zodToSchema(SettingsSchema);
export const mapping = zodToSchema(MappingSchema);

// Nested JSON Schemas for sub-pages
export const ga4 = zodToSchema(GA4SettingsSchema);
export const ads = zodToSchema(AdsSettingsSchema);
export const gtm = zodToSchema(GTMSettingsSchema);
