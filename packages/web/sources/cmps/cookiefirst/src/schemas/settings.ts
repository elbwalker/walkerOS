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
        'Has no effect in this source: it skips CookieFirst.consent while it is null (no choice made yet) and reports every consent CookieFirst provides after that, whether explicitOnly is true or false. Default: true.',
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
