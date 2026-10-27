import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    apiKey: z
      .string()
      .min(1)
      .describe(
        'Your Amplitude project API key. Find it in your Amplitude project settings under "General" -> "API Keys".',
      ),
    serverZone: z
      .enum(['US', 'EU'])
      .describe(
        'Amplitude data residency zone. Use EU for European data residency. Default: US.',
      )
      .optional(),
    flushIntervalMillis: z
      .number()
      .int()
      .positive()
      .describe(
        'How long (in ms) the SDK waits before it sends queued events, and before its first retry of a failed request. Default: a tenth of config.timeout (1000 at the 10 s default). A value set here wins.',
      )
      .optional(),
    flushQueueSize: z
      .number()
      .int()
      .positive()
      .describe(
        'Events the SDK sends in one request. Each push and each config.batch batch flushes the SDK and waits until Amplitude answered its calls. Default: 200.',
      )
      .optional(),
    flushMaxRetries: z
      .number()
      .int()
      .nonnegative()
      .describe(
        "Attempts per event, the first send included. Default: as many as end within config.timeout with the SDK's waits, each request bounded by a quarter of it (3 at the 10 s default). A value set here wins.",
      )
      .optional(),
    useBatch: z
      .boolean()
      .describe(
        'Use the Amplitude batch endpoint for higher rate limits. Recommended for high-volume server flows. Default: false.',
      )
      .optional(),
    minIdLength: z
      .number()
      .int()
      .positive()
      .describe('Minimum length for user_id and device_id fields.')
      .optional(),
    serverUrl: z
      .string()
      .url()
      .describe('Custom server URL for proxies or self-hosted endpoints.')
      .optional(),
    optOut: z
      .boolean()
      .describe(
        'Initial opt-out state. When true, no events are sent, and each event the destination receives fails with a transport error. Default: false.',
      )
      .optional(),
    enableRequestBodyCompression: z
      .boolean()
      .describe('Enable gzip compression for request payloads. Default: false.')
      .optional(),
    identify: z
      .unknown()
      .describe(
        'walkerOS mapping value resolving to per-event identity. Keys: user_id, device_id, session_id, set, setOnce, add, append, prepend, preInsert, postInsert, remove, unset, clearAll.',
      )
      .optional(),
    eventOptions: z
      .unknown()
      .describe(
        'walkerOS mapping value resolving to per-event EventOptions. Keys: time, insert_id, ip, city, country, region, language, platform, os_name, os_version, device_brand, device_model, app_version, user_agent.',
      )
      .optional(),
    include: z
      .array(z.string())
      .describe(
        "walkerOS event sections to include as event_properties (like ['data', 'globals']).",
      )
      .optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
