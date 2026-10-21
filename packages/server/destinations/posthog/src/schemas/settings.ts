import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    apiKey: z
      .string()
      .min(1)
      .describe(
        'PostHog project API key (starts with "phc_"). Find it in PostHog project settings.',
      ),
    host: z
      .string()
      .describe(
        'PostHog API host. Defaults to https://us.i.posthog.com. Use https://eu.i.posthog.com for EU or your self-hosted URL.',
      )
      .optional(),
    flushAt: z
      .number()
      .describe(
        'Number of queued group identifies before auto-flush. Captures and identifies are sent at once, each push awaiting its own call. Default: 20.',
      )
      .optional(),
    flushInterval: z
      .number()
      .describe(
        'Milliseconds between periodic flushes of queued group identifies. Default: 10000.',
      )
      .optional(),
    personalApiKey: z
      .string()
      .describe('Personal API key (phx_...) for local feature flag evaluation.')
      .optional(),
    featureFlagsPollingInterval: z
      .number()
      .describe(
        'Milliseconds between feature flag definition polls. Default: 30000.',
      )
      .optional(),
    disableGeoip: z
      .boolean()
      .describe('Disable GeoIP lookups globally. Useful for GDPR compliance.')
      .optional(),
    disableCompression: z
      .boolean()
      .describe('Send requests uncompressed (no gzip). Default: false.')
      .optional(),
    requestTimeout: z
      .number()
      .describe(
        'Milliseconds before a request to PostHog times out. Default: a quarter of config.timeout (2500 at the 10 s default). A value set here wins.',
      )
      .optional(),
    fetchRetryCount: z
      .number()
      .describe(
        'Retries of a failed request to PostHog. Default: 2, which with the default timeout and delay ends within config.timeout. A value set here wins.',
      )
      .optional(),
    fetchRetryDelay: z
      .number()
      .describe(
        'Milliseconds between retries of a failed request. Default: a tenth of config.timeout (1000 at the 10 s default). A value set here wins.',
      )
      .optional(),
    debug: z
      .boolean()
      .describe('Enable PostHog SDK debug logging. Default: false.')
      .optional(),
    disabled: z
      .boolean()
      .describe('Disable the PostHog client: nothing is sent. Default: false.')
      .optional(),
    identify: z
      .unknown()
      .describe(
        'walkerOS mapping value resolving to an identity object. Keys: distinctId, $set, $set_once. Resolved on every push (server is stateless).',
      )
      .optional(),
    group: z
      .unknown()
      .describe(
        'walkerOS mapping value resolving to a group object. Keys: type, key, properties. Resolved on every push.',
      )
      .optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
