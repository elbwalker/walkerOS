import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  topicArn: z
    .string()
    .describe(
      'Topic ARN (like arn:aws:sns:eu-central-1:123456789012:walkeros-events). Region and topic name derive from it. Required unless topicName is set.',
    )
    .optional(),
  topicName: z
    .string()
    .min(1)
    .describe(
      'Topic name (like walkeros-events). Used by walkeros setup; without topicArn the ARN is completed with the account id at the first publish.',
    )
    .optional(),
  region: z
    .string()
    .describe(
      'AWS region (like eu-central-1). Default: the region in topicArn, AWS_REGION or the active profile, else eu-central-1.',
    )
    .optional(),
  client: z
    .any()
    .describe(
      'An SNSClient of your own. Used as is and never closed by the destination.',
    )
    .optional(),
  config: z
    .any()
    .describe(
      'Raw SNSClient options passed to the SDK. Put keys in config.credentials instead.',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
