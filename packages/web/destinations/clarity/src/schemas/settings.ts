import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe(
      'Your Microsoft Clarity project ID (e.g. "3t0wlogvdz"). Find it in your Clarity dashboard under Settings → Setup.',
    ),
  consent: z
    .record(z.string(), z.enum(['analytics_Storage', 'ad_Storage']))
    .describe(
      'Translation table from walkerOS consent keys to Clarity ConsentV2 categories. Example: { "analytics": "analytics_Storage", "marketing": "ad_Storage" }. Required to get meaningful consent behavior — Clarity expects its own category names.',
    )
    .optional(),
  identify: z
    .unknown()
    .describe(
      'walkerOS mapping value resolving to positional arguments for Clarity.identify(). Keys: customId (required), customSessionId?, customPageId?, friendlyName?.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
