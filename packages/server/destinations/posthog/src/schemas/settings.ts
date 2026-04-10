import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
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
    .describe('Number of events queued before auto-flush. Default: 20.')
    .optional(),
  flushInterval: z
    .number()
    .describe('Milliseconds between periodic flushes. Default: 10000.')
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
  debug: z
    .boolean()
    .describe('Enable PostHog SDK debug logging. Default: false.')
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
  include: z
    .array(z.string())
    .describe(
      'Event sections to flatten into capture() properties (e.g. ["data", "globals"]).',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
