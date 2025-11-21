import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  appId: z
    .string()
    .min(1)
    .describe('ID of the Piwik PRO site (like XXX-XXX-XXX-XXX-XXX)'),
  url: z
    .string()
    .url()
    .describe(
      'URL of your Piwik PRO account (like https://your_account_name.piwik.pro/)',
    ),
  linkTracking: z
    .boolean()
    .default(false)
    .describe('Enables/Disables download and outlink tracking'),
});

export type Settings = z.infer<typeof SettingsSchema>;
