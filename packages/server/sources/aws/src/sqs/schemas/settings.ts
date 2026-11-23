import { z } from '@walkeros/core/dev';

/**
 * AWS SQS source settings schema.
 *
 * Required: queueName. All other fields optional with sensible defaults
 * applied at runtime by `getConfig`.
 */
export const SettingsSchema = z.object({
  queueName: z
    .string()
    .min(1)
    .describe(
      'SQS queue short name (like walkeros-events). Required for both setup and runtime poll.',
    ),
  region: z
    .string()
    .describe('AWS region (like eu-central-1). Default: eu-central-1.')
    .optional(),
  queueUrl: z
    .string()
    .url()
    .describe(
      'Optional pre-resolved queue URL. When set, init skips the GetQueueUrl lookup.',
    )
    .optional(),
  client: z
    .any()
    .describe(
      'Pre-configured AWS SQSClient instance. Bypasses construction when supplied.',
    )
    .optional(),
  config: z
    .any()
    .describe(
      'AWS SDK SQSClientConfig (credentials, endpoint overrides, retries).',
    )
    .optional(),
  decoder: z
    .enum(['json', 'text', 'raw'])
    .describe(
      'Decoder for the message body. json (default) parses JSON; text forwards the body as data.payload; raw forwards it base64 encoded as data.payload. text and raw events need a before transformer that sets the event name.',
    )
    .optional(),
  maxMessages: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe('SQS receive batch size. Cap 10. Default: 10.')
    .optional(),
  waitTimeSeconds: z
    .number()
    .int()
    .min(0)
    .max(20)
    .describe('Long-poll duration in seconds. Cap 20. Default: 20.')
    .optional(),
  visibilityTimeout: z
    .number()
    .int()
    .nonnegative()
    .describe(
      'Per-receive visibility timeout override. Default: queue-configured value.',
    )
    .optional(),
  shutdownTimeoutMs: z
    .number()
    .int()
    .positive()
    .describe(
      'How long a close waits for messages in flight, in milliseconds. Default: 5000. On shutdown the source ends its long poll and lets messages in flight finish; after this window it closes, and messages not yet deleted redeliver after their visibility timeout.',
    )
    .optional(),
  onPushError: z
    .enum(['nack', 'ack'])
    .describe(
      'Behavior when a message is not delivered and a redelivery could still deliver it (a retryable failure), or when decoding or forwarding throws. nack (default) skips DeleteMessage so the message redelivers; ack drops it.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
