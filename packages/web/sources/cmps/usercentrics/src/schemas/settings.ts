import { z } from '@walkeros/core/dev';

/**
 * Usercentrics source settings schema
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
        'Only publish when the user has actively decided (V3: consent.type EXPLICIT; V2: an EXPLICIT entry in service consent history). Implicit/default page-load states are suppressed. Set false to publish any snapshot including implicit. Default: true.',
      )
      .optional(),
  })
  .meta({
    id: 'UsercentricsSettings',
    title: 'Settings',
    description: 'Settings for the Usercentrics CMP source.',
  });

export type Settings = z.infer<typeof SettingsSchema>;
