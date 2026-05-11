import { z } from '@walkeros/core/dev';

/**
 * AWS SQS source setup schema.
 *
 * Provisioning options for `walkeros setup source.<id>`. Authoritative-apply:
 * declared state is written via a single CreateQueueCommand; non-declared
 * tags or attributes are left untouched.
 */
const TagsSchema = z.record(z.string(), z.string());

export const SetupSchema = z.object({
  region: z.string().min(1).describe('AWS region.').optional(),
  fifoQueue: z
    .boolean()
    .describe(
      'FIFO queue with content-based deduplication. Auto-appends .fifo suffix to the queue name.',
    )
    .optional(),
  visibilityTimeoutSeconds: z
    .number()
    .int()
    .nonnegative()
    .describe('Visibility timeout in seconds. Default: 30.')
    .optional(),
  messageRetentionSeconds: z
    .number()
    .int()
    .positive()
    .describe('Message retention period in seconds. Default: 345600 (4 days).')
    .optional(),
  maximumMessageSize: z
    .number()
    .int()
    .min(1024)
    .max(262144)
    .describe('Max message size in bytes. Default: 262144 (256 KB).')
    .optional(),
  kmsMasterKeyId: z
    .string()
    .describe('KMS key alias or ID for at-rest encryption.')
    .optional(),
  deadLetterQueue: z
    .object({
      arn: z
        .string()
        .describe(
          'ARN of an existing DLQ. Mutually exclusive with create: true.',
        )
        .optional(),
      create: z
        .boolean()
        .describe('Create a sibling DLQ named <queueName>-dlq. Default: false.')
        .optional(),
      maxReceiveCount: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .describe('Max receive count before message goes to DLQ. Default: 5.')
        .optional(),
    })
    .describe('Optional dead-letter queue.')
    .optional(),
  tags: TagsSchema.describe(
    'Tags applied to the queue (and inherited by an auto-created DLQ).',
  ).optional(),
  subscribeToSnsTopic: z
    .object({
      topicArn: z.string().min(1).describe('Topic ARN to subscribe to.'),
      rawMessageDelivery: z
        .boolean()
        .describe('Deliver SNS messages without the SNS envelope.')
        .optional(),
      filterPolicy: z
        .record(z.string(), z.unknown())
        .describe('SNS filter policy applied at subscription level.')
        .optional(),
    })
    .describe(
      'Optional SNS topic subscription. Creates the subscription and the matching queue policy.',
    )
    .optional(),
});

export type Setup = z.infer<typeof SetupSchema>;
