import { z, zodToSchema } from '@walkeros/core/dev';

/**
 * Settings schema: describes the settings for `walkeros validate`,
 * walkerOS.json and the docs. Add a key for every setting the source reads;
 * the source applies the defaults inline.
 */
export const SettingsSchema = z.object({});

// JSON Schema for walkerOS.json (`dev.ts` exports `schemas.settings`)
export const settings = zodToSchema(SettingsSchema);
