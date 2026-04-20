import { z } from '@walkeros/core/dev';

/**
 * CookiePro / OneTrust source settings schema
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
        'Only process consent after the user closed the OneTrust banner (IsAlertBoxClosed). Default: true.',
      )
      .optional(),

    globalName: z
      .string()
      .describe(
        "Custom name for the OneTrust global on window. Default: 'OneTrust'.",
      )
      .optional(),
  })
  .meta({
    id: 'CookieProSettings',
    title: 'Settings',
    description: 'Settings for the CookiePro / OneTrust CMP source.',
  });

export type Settings = z.infer<typeof SettingsSchema>;
