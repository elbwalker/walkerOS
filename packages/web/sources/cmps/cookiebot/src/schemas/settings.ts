import { z } from '@walkeros/core/dev';

/**
 * Cookiebot source settings schema
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
        "Only process consent the visitor actively gave (Cookiebot consent.method 'explicit'). Implied consent, which Cookiebot sets on its own (outside a region that requires consent, an implied banner, or an old consent), is skipped. Default: true.",
      )
      .optional(),
  })
  .meta({
    id: 'CookiebotSettings',
    title: 'Settings',
    description: 'Settings for the Cookiebot CMP source.',
  });

export type Settings = z.infer<typeof SettingsSchema>;
