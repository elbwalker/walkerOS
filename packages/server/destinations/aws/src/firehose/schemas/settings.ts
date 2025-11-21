import { z } from '@walkeros/core/dev';

export const FirehoseConfigSchema = z.object({
  streamName: z
    .string()
    .min(1)
    .describe(
      'Name of the Kinesis Data Firehose delivery stream (like walker-events)',
    ),
  client: z
    .any()
    .describe(
      'Pre-configured AWS Firehose client instance (like new FirehoseClient(config))',
    )
    .optional(),
  region: z
    .string()
    .describe('AWS region for the Firehose service (like us-east-1)')
    .optional(),
  config: z
    .any()
    .describe(
      'AWS SDK client configuration options (like { credentials: awsCredentials })',
    )
    .optional(),
});

export const SettingsSchema = z.object({
  firehose: FirehoseConfigSchema.describe(
    "AWS Firehose configuration settings (like { streamName: 'walker-events', region: 'us-east-1' })",
  ).optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
