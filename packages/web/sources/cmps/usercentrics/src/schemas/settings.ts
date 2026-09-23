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

    apiVersion: z
      .enum(['auto', 'v2', 'v3'])
      .describe(
        "Which Usercentrics API to use. 'auto' uses V3 (window.__ucCmp) when present, else V2 (window.UC_UI), and listens for both while neither is loaded. Default: 'auto'.",
      )
      .optional(),

    v3EventName: z
      .string()
      .describe(
        "Window event the V3 adapter listens to for consent decisions, replacing UC_UI_CMP_EVENT. Only events whose detail.type is ACCEPT_ALL, DENY_ALL or SAVE are processed. Default: 'UC_UI_CMP_EVENT'.",
      )
      .optional(),
  })
  .meta({
    id: 'UsercentricsSettings',
    title: 'Settings',
    description: 'Settings for the Usercentrics CMP source.',
  });

export type Settings = z.infer<typeof SettingsSchema>;
