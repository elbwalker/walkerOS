import { z } from '@walkeros/core/dev';

/**
 * GCP Pub/Sub pull source settings schema.
 *
 * Required: projectId, subscription. All other fields optional with sensible
 * defaults applied at runtime by `getConfig`.
 */
export const SettingsSchema = z.object({
  client: z
    .any()
    .describe(
      'Pre-configured Google Cloud Pub/Sub client (like new PubSub({ projectId })). Bypasses credentials resolution when supplied.',
    )
    .optional(),
  projectId: z
    .string()
    .min(1)
    .describe('Google Cloud Project ID (like my-gcp-project).'),
  subscription: z
    .string()
    .min(1)
    .describe(
      'Pub/Sub subscription short name (like events-sub). The full resource name projects/<projectId>/subscriptions/<subscription> is built by the SDK.',
    ),
  topic: z
    .string()
    .describe(
      'Pub/Sub topic short name. Required when setup.createTopic is true; otherwise informational.',
    )
    .optional(),
  credentials: z
    .any()
    .describe(
      'Service account credentials as a JSON string or an object with client_email and private_key. Default: Application Default Credentials (ADC).',
    )
    .optional(),
  apiEndpoint: z
    .string()
    .describe(
      'Override Pub/Sub API endpoint. Useful for the local emulator (like localhost:8085).',
    )
    .optional(),
  decoder: z
    .enum(['json', 'text', 'raw'])
    .describe(
      'Decoder for the message data field. json (default) parses JSON, text decodes UTF-8, raw forwards the Buffer.',
    )
    .optional(),
  flowControl: z
    .object({
      maxMessages: z
        .number()
        .describe('Maximum in-flight messages. Default: 100.')
        .optional(),
      maxBytes: z
        .number()
        .describe('Maximum in-flight bytes. Default: 10485760 (10 MB).')
        .optional(),
    })
    .describe('Subscriber flow control. Tightens the SDK defaults.')
    .optional(),
  ackDeadline: z
    .number()
    .describe('Subscriber ack deadline in seconds. Default: 60.')
    .optional(),
  shutdownTimeoutMs: z
    .number()
    .describe(
      'Graceful shutdown timeout in milliseconds. Default: 30000. After this window, destroy() force-closes the subscriber.',
    )
    .optional(),
  onPushError: z
    .enum(['nack', 'ack'])
    .describe(
      'Behavior when forwarding to the collector throws. nack (default) redelivers the message; ack drops it.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
