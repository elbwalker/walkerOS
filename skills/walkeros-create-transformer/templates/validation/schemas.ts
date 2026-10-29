import { z, zodToSchema } from '@walkeros/core/dev';

/**
 * Settings schema: describes the settings for `walkeros validate`,
 * `walkerOS.json` and the docs. The transformer applies its defaults inline
 * and never parses settings at runtime.
 */
export const SettingsSchema = z.object({
  fieldsToRedact: z
    .array(z.string())
    .describe('Top-level data fields to remove. Default: []')
    .optional(),
  logRedactions: z
    .boolean()
    .describe('Write a DEBUG line per removed field. Default: false')
    .optional(),
});

// JSON Schema for walkerOS.json (`dev.ts` exports `schemas.settings`)
export const settings = zodToSchema(SettingsSchema);
