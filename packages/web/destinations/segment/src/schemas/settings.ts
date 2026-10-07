import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  apiKey: z
    .string()
    .min(1)
    .describe(
      'Your Segment source write key. Find it in your Segment workspace under Connections, Sources, Settings, API Keys. Maps to `writeKey` in the Analytics.js `load()` call (like a1B2c3D4e5F6a1B2c3D4e5F6a1B2c3D4).',
    ),
  cdnURL: z
    .string()
    .describe(
      'Not applied: the destination passes it in the load() options, where Analytics.js does not read it, so settings are always fetched from https://cdn.segment.com.',
    )
    .optional(),
  initialPageview: z
    .boolean()
    .describe(
      'When true, the SDK fires an automatic initial page() call on load. Default: false (walkerOS sources handle page tracking, so this is disabled to avoid duplicate page views).',
    )
    .optional(),
  disableClientPersistence: z
    .boolean()
    .describe(
      'When true, prevents any cookie or localStorage writes. Useful for privacy-conscious setups. Default: false.',
    )
    .optional(),
  disableAutoISOConversion: z
    .boolean()
    .describe('Disable automatic ISO string → Date conversion. Default: false.')
    .optional(),
  retryQueue: z
    .boolean()
    .describe('Retry failed events. Default: true.')
    .optional(),
  obfuscate: z
    .boolean()
    .describe('Obfuscate event payloads. Default: false.')
    .optional(),
  integrations: z
    .record(z.string(), z.unknown())
    .describe(
      'Enable/disable downstream Segment destinations. Example: { "All": true, "Mixpanel": false }.',
    )
    .optional(),
  identify: z
    .unknown()
    .describe(
      'Destination-level identity mapping. Resolves to an object with any of: userId, traits, anonymousId. Resolved on every push: analytics.identify fires on the first push and when userId or traits change, and on every push while anonymousId is set.',
    )
    .optional(),
  group: z
    .unknown()
    .describe(
      'Destination-level group mapping. Resolves to an object with: groupId, traits. Fires on the first push and re-fires on change.',
    )
    .optional(),
  consent: z
    .record(z.string(), z.string())
    .describe(
      'Mapping from walkerOS consent keys → Segment `categoryPreferences` keys. Example: { "marketing": "Advertising", "analytics": "Analytics" }. Only mapped keys are forwarded; when omitted, no consent context is sent.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
