import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    writeKey: z
      .string()
      .min(1)
      .describe(
        'Segment source write key. Find it in your Segment workspace under Connections > Sources > Settings > API Keys.',
      ),
    userId: z
      .string()
      .describe(
        'walkerOS mapping value path to resolve userId from each event (like user.id).',
      )
      .optional(),
    anonymousId: z
      .string()
      .describe(
        'walkerOS mapping value path to resolve anonymousId from each event (like user.session).',
      )
      .optional(),
    host: z
      .string()
      .url()
      .describe(
        'Base URL of Segment API. Set to https://events.eu1.segmentapis.com for EU endpoint.',
      )
      .optional(),
    path: z.string().describe('API path route (like /v1/batch).').optional(),
    flushAt: z
      .number()
      .int()
      .positive()
      .describe(
        'Events the SDK sends in one request. Each push and each config.batch batch flushes the SDK and waits until Segment delivered its calls. Default: 15.',
      )
      .optional(),
    flushInterval: z
      .number()
      .int()
      .positive()
      .describe('Max milliseconds before auto-flush. Default: 10000.')
      .optional(),
    maxRetries: z
      .number()
      .int()
      .min(0)
      .describe(
        "Retries the SDK makes for a failed request. Default: as many as fit config.timeout with the SDK's backoff (one at the 10 s default, two from 24 s). A value set here wins.",
      )
      .optional(),
    httpRequestTimeout: z
      .number()
      .int()
      .positive()
      .describe(
        'Time one request may take, in milliseconds. Default: a quarter of config.timeout (2500 at the 10 s default). A value set here wins.',
      )
      .optional(),
    disable: z
      .boolean()
      .describe(
        'Completely disable the SDK (no-ops all calls). Default: false.',
      )
      .optional(),
    identify: z
      .unknown()
      .describe(
        'Destination-level identity mapping. Resolves to { traits } object. Fires identify() on the first push and re-fires when values change.',
      )
      .optional(),
    group: z
      .unknown()
      .describe(
        'Destination-level group mapping. Resolves to { groupId, traits }. Fires group() on the first push and re-fires on change.',
      )
      .optional(),
    consent: z
      .record(z.string(), z.string())
      .describe(
        'Mapping from walkerOS consent keys to Segment categoryPreferences keys. Example: { "marketing": "Advertising", "analytics": "Analytics" }.',
      )
      .optional(),
    integrations: z
      .record(z.string(), z.unknown())
      .describe(
        'Enable/disable downstream Segment destinations. Example: { "All": true, "Mixpanel": false }.',
      )
      .optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
