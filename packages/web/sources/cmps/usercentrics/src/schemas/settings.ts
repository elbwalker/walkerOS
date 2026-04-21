import { z } from '@walkeros/core/dev';

/**
 * Usercentrics source settings schema
 */
export const SettingsSchema = z
  .object({
    eventName: z
      .string()
      .describe(
        "Window event name to listen for, configured in the Usercentrics admin (Implementation > Data Layer & Events). Use 'UC_SDK_EVENT' for the built-in Browser SDK event. Default: 'ucEvent'.",
      )
      .optional(),

    categoryMap: z
      .record(z.string(), z.string())
      .describe(
        "Map the CMP's consent categories (keys) to walkerOS consent groups (values).",
      )
      .optional(),

    explicitOnly: z
      .boolean()
      .describe(
        "Only process consent_status events where type is 'explicit'. Ignores implicit/default page-load events. Default: true.",
      )
      .optional(),
  })
  .meta({
    id: 'UsercentricsSettings',
    title: 'Settings',
    description: 'Settings for the Usercentrics CMP source.',
  });

export type Settings = z.infer<typeof SettingsSchema>;
