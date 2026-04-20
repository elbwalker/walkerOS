import { z } from '@walkeros/core/dev';

/**
 * CookieFirst source settings schema
 */
export const SettingsSchema = z
  .object({
    categoryMap: z
      .record(z.string(), z.string())
      .describe(
        "Map the CMP's consent categories (keys) to walkerOS consent groups (values).",
      )
      .optional(),

    explicitOnly: z
      .boolean()
      .describe(
        'Only process consent after the user made an explicit choice. Ignores default/implicit states. Default: true.',
      )
      .optional(),

    globalName: z
      .string()
      .describe(
        "Custom name for the CookieFirst global on window. Default: 'CookieFirst'.",
      )
      .optional(),
  })
  .meta({
    id: 'CookieFirstSettings',
    title: 'Settings',
    description: 'Settings for the CookieFirst CMP source.',
  });

export type Settings = z.infer<typeof SettingsSchema>;
