import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe(
      'Your Mixpanel project token. Find it in Project Settings > Access Keys. Passed as the first argument to Mixpanel.init().',
    ),
  secret: z
    .string()
    .describe(
      'API secret for the /import endpoint (historical data). Required when useImport is true.',
    )
    .optional(),
  host: z
    .string()
    .describe(
      "Mixpanel API host. Default: 'api.mixpanel.com' (US). Use 'api-eu.mixpanel.com' (EU) or 'api-in.mixpanel.com' (India).",
    )
    .optional(),
  protocol: z
    .string()
    .describe("Protocol for API requests. Default: 'https'.")
    .optional(),
  keepAlive: z
    .boolean()
    .describe('Reuse HTTP connections. Default: true.')
    .optional(),
  geolocate: z
    .boolean()
    .describe(
      'Parse IP for geolocation. Default: false. Server IP caveat: all users map to server location unless $ip is overridden.',
    )
    .optional(),
  debug: z
    .boolean()
    .describe('Enable SDK debug logging. Default: false.')
    .optional(),
  verbose: z
    .boolean()
    .describe('Enable verbose request logging. Default: false.')
    .optional(),
  test: z.boolean().describe('Enable dry-run mode. Default: false.').optional(),
  useImport: z
    .boolean()
    .describe(
      'Use /import endpoint instead of /track. Accepts events of any age (no 5-day limit). Requires secret for authentication.',
    )
    .optional(),
  identify: z
    .unknown()
    .describe(
      'walkerOS mapping value resolving to { distinctId, alias? }. distinctId is passed as distinct_id on every SDK call.',
    )
    .optional(),
  include: z
    .unknown()
    .describe(
      "Event data sections to flatten into track() properties. Example: ['data', 'globals']. Sections are prefixed (data_, globals_, etc.).",
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
