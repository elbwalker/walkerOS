import { z } from '@walkeros/core/dev';

/**
 * CookieConsent source settings schema
 */
export const SettingsSchema = z
  .object({
    categoryMap: z
      .record(z.string(), z.string())
      .describe(
        "Map CookieConsent's category names (keys) to walkerOS consent groups (values). Categories without an entry keep their own name. Default: { ads: 'marketing' }.",
      )
      .optional(),
  })
  .meta({
    id: 'CookieConsentSettings',
    title: 'Settings',
    description: 'Settings for the CookieConsent CMP source.',
  });

export type Settings = z.infer<typeof SettingsSchema>;
