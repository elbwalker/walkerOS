import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe(
      'Your Mixpanel project token. Find it in your Mixpanel project settings under "Project Settings" → "Access Keys". Passed to mixpanel.init() as the first argument.',
    ),
  api_host: z
    .string()
    .describe(
      'Mixpanel ingestion host. Default: https://api-js.mixpanel.com. Use https://api-eu.mixpanel.com for EU residency.',
    )
    .optional(),
  persistence: z
    .enum(['cookie', 'localStorage'])
    .describe('Client-side persistence backend. Default: cookie.')
    .optional(),
  cross_subdomain_cookie: z
    .boolean()
    .describe('Share cookie across subdomains. Default: true.')
    .optional(),
  cookie_expiration: z
    .number()
    .int()
    .nonnegative()
    .describe('Cookie expiration in days. Default: 365.')
    .optional(),
  secure_cookie: z
    .boolean()
    .describe('Only send cookie over HTTPS. Default: false.')
    .optional(),
  ip: z
    .boolean()
    .describe('Enable server-side IP geolocation. Default: true.')
    .optional(),
  batch_requests: z
    .boolean()
    .describe(
      'Use the /batch endpoint instead of individual requests. Default: true.',
    )
    .optional(),
  batch_size: z
    .number()
    .int()
    .positive()
    .describe('Max events per batch. Default: 50.')
    .optional(),
  batch_flush_interval_ms: z
    .number()
    .int()
    .positive()
    .describe('Batch flush interval in ms. Default: 5000.')
    .optional(),
  debug: z
    .boolean()
    .describe('Enable verbose SDK logging. Default: false.')
    .optional(),
  opt_out_tracking_by_default: z
    .boolean()
    .describe(
      'Start in opted-out state until opt_in_tracking() is called. Default: false.',
    )
    .optional(),
  track_pageview: z
    .union([z.boolean(), z.string()])
    .describe(
      'Enable Mixpanel auto-pageview tracking. walkerOS default: false — walkerOS sources handle page views.',
    )
    .optional(),
  autocapture: z
    .unknown()
    .describe(
      'Enable Mixpanel web autocapture. walkerOS default: false — walkerOS sources handle event capture.',
    )
    .optional(),
  record_sessions_percent: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'Session replay sampling rate (0-100). Default: 0 (disabled). Session replay is bundled in the npm build.',
    )
    .optional(),
  record_mask_all_inputs: z
    .boolean()
    .describe('Mask all input values in session replay. Default: true.')
    .optional(),
  identify: z
    .unknown()
    .describe(
      'walkerOS mapping value resolving to an identity object. Keys: distinctId.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'walkerOS mapping value resolving to { key, id } → mixpanel.set_group(key, id). Runs on destination init or per-event.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
