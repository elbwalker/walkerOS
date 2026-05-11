import { z } from '@walkeros/core/dev';

/**
 * GCP Pub/Sub pull source setup schema.
 *
 * Provisioning options for `walkeros setup source.<id>`. Idempotent
 * subscription creation, plus optional topic and dead-letter topic
 * auto-create. Triggered only by the explicit CLI command.
 */
export const SetupSchema = z.object({
  createTopic: z
    .boolean()
    .describe(
      'Create the topic if it does not exist. Requires settings.topic. Default: false (require pre-existing topic).',
    )
    .optional(),
  ackDeadlineSeconds: z
    .number()
    .describe('Subscription ack deadline in seconds. Default: 60.')
    .optional(),
  messageRetentionDuration: z
    .object({
      seconds: z
        .number()
        .describe('Retention window in seconds. Default: project default.'),
    })
    .describe('Subscription-level retention configuration.')
    .optional(),
  filter: z
    .string()
    .describe(
      'Subscription filter expression. Only messages matching this filter are delivered.',
    )
    .optional(),
  deadLetterPolicy: z
    .object({
      deadLetterTopic: z.string().describe('Dead-letter topic short name.'),
      maxDeliveryAttempts: z
        .number()
        .describe(
          'Maximum delivery attempts before forwarding to the dead-letter topic.',
        ),
      createDeadLetterTopic: z
        .boolean()
        .describe(
          'Auto-create the dead-letter topic if it does not exist. Default: false.',
        )
        .optional(),
    })
    .describe('Dead-letter policy. Strongly recommended for production.')
    .optional(),
  retryPolicy: z
    .object({
      minimumBackoff: z.object({
        seconds: z.number().describe('Minimum backoff in seconds.'),
      }),
      maximumBackoff: z.object({
        seconds: z.number().describe('Maximum backoff in seconds.'),
      }),
    })
    .describe('Subscription retry policy.')
    .optional(),
  enableMessageOrdering: z
    .boolean()
    .describe('Enable message ordering on the subscription. Default: false.')
    .optional(),
  labels: z
    .record(z.string(), z.string())
    .describe('Subscription labels for organization and billing.')
    .optional(),
  expirationPolicy: z
    .object({
      ttl: z
        .object({
          seconds: z
            .number()
            .describe('TTL in seconds. null means never expire.'),
        })
        .nullable()
        .optional(),
    })
    .describe('Subscription expiration policy.')
    .optional(),
});

export type Setup = z.infer<typeof SetupSchema>;
