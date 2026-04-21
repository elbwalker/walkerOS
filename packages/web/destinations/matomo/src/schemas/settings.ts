import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  siteId: z.string().min(1).describe('Matomo Site ID (like 1, 2, etc.)'),
  url: z
    .string()
    .url()
    .describe(
      'Base URL of your Matomo instance (like https://analytics.example.com/ or https://yourname.matomo.cloud/)',
    ),
  disableCookies: z
    .boolean()
    .default(false)
    .describe('Disable all tracking cookies for cookie-free analytics'),
  enableLinkTracking: z
    .boolean()
    .default(true)
    .describe('Enable automatic outlink and download tracking'),
  enableHeartBeatTimer: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Enable heart beat timer with interval in seconds for accurate time-on-page',
    ),
  customDimensions: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Custom dimension ID to property path mapping applied to all events (like { "1": "data.userType" })',
    ),
});

export type Settings = z.infer<typeof SettingsSchema>;
