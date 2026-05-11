import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  topicName: z
    .string()
    .min(1)
    .describe('SNS topic name (like walkeros-events). Required.'),
  region: z.string().describe('AWS region (like eu-central-1).').optional(),
  client: z.any().describe('Pre-configured AWS SNSClient instance.').optional(),
  config: z
    .any()
    .describe('AWS SDK SNSClient configuration options.')
    .optional(),
  topicArn: z
    .string()
    .describe(
      'Topic ARN. Populated by init() from CreateTopic. Operators may pre-set to skip the runtime CreateTopic call.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
