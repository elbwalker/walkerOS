import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  writeKey: z
    .string()
    .min(1)
    .describe(
      'RudderStack source write key. Find it in the RudderStack dashboard under Sources > Setup.',
    ),
  dataPlaneUrl: z
    .string()
    .url()
    .describe(
      'RudderStack data plane URL. Required. Example: https://your-data-plane.rudderstack.com',
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
  path: z.string().describe('API path route (like /v1/batch).').optional(),
  flushAt: z
    .number()
    .int()
    .positive()
    .describe('Events to enqueue before flushing a batch. Default: 20.')
    .optional(),
  flushInterval: z
    .number()
    .int()
    .positive()
    .describe('Max milliseconds before auto-flush. Default: 10000.')
    .optional(),
  maxQueueSize: z
    .number()
    .int()
    .positive()
    .describe('Maximum batch payload size in bytes. Default: 460800 (~500KB).')
    .optional(),
  maxInternalQueueSize: z
    .number()
    .int()
    .positive()
    .describe('Maximum in-memory queue length. Default: 20000.')
    .optional(),
  logLevel: z
    .string()
    .describe(
      "SDK log level: 'info', 'debug', 'error', or 'silly'. Default: 'info'.",
    )
    .optional(),
  retryCount: z
    .number()
    .int()
    .min(0)
    .describe('Retry attempts for failed batches. Default: 3.')
    .optional(),
  enable: z
    .boolean()
    .describe('Set to false to no-op all SDK calls. Default: true.')
    .optional(),
  gzip: z
    .boolean()
    .describe('Enable gzip compression for requests. Default: true.')
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
  integrations: z
    .record(z.string(), z.unknown())
    .describe(
      'Enable/disable downstream RudderStack destinations. Example: { "All": true, "Mixpanel": false }.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
