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
      'Decoder for the message body. json (default) parses JSON, text forwards UTF-8, raw forwards a Buffer.',
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
      'Graceful shutdown timeout in milliseconds. Default: 30000. After this window, destroy() force-closes.',
    )
    .optional(),
  onPushError: z
    .enum(['nack', 'ack'])
    .describe(
      'Behavior when forwarding to the collector throws. nack (default) skips DeleteMessage so the message redelivers; ack drops it.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
