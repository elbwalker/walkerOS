import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
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
      .describe(
        'Events the SDK sends in one request. Each push and each config.batch batch flushes the SDK and waits until its calls are sent. Default: 20.',
      )
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
      .describe(
        'Maximum batch payload size in bytes. Default: 460800 (450 KB).',
      )
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
      .describe(
        'Retries the SDK makes for a failed request, a tenth of config.timeout apart. Default: 2, which ends within config.timeout. A value set here wins.',
      )
      .optional(),
    timeout: z
      .number()
      .int()
      .positive()
      .describe(
        'Time one request may take, in milliseconds. Default: a quarter of config.timeout (2500 at the 10 s default). A value set here wins.',
      )
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
        'Destination-level identity mapping. Resolves to { userId?, traits? }. identify() fires when the userId or traits differ from the previous identify call this destination sent; the anonymousId is not compared.',
      )
      .optional(),
    group: z
      .unknown()
      .describe(
        'Destination-level group mapping. Resolves to { groupId, traits? }. group() fires when the groupId or traits differ from the previous group call this destination sent; the user is not compared.',
      )
      .optional(),
    integrations: z
      .record(z.string(), z.unknown())
      .describe(
        'Has no effect: the destination does not add integrations to its calls.',
      )
      .optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
