import { z } from '@walkeros/core';

/**
 * PiwikPro Settings Schema
 * Configuration for PiwikPro analytics destination
 */
export const SettingsSchema = z.object({
  appId: z
    .string()
    .min(1)
    .describe('PiwikPRO App ID (UUID format: XXX-XXX-XXX-XXX-XXX)'),
  url: z
    .string()
    .url()
    .describe(
      'PiwikPRO instance URL (e.g., https://your_account_name.piwik.pro/)',
    ),
  linkTracking: z
    .boolean()
    .describe('Enable automatic download and outlink tracking')
    .optional(),
});

/**
 * Type inference from SettingsSchema
 */
export type Settings = z.infer<typeof SettingsSchema>;
