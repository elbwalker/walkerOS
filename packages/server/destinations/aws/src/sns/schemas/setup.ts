import { z } from '@walkeros/core/dev';

export const SetupSubscriptionSchema = z.object({
  protocol: z.enum(['sqs', 'lambda', 'https', 'http', 'email', 'sms']),
  endpoint: z.string().min(1),
  rawMessageDelivery: z.boolean().optional(),
  filterPolicy: z.record(z.string(), z.unknown()).optional(),
  deadLetterTargetArn: z.string().optional(),
});

export const SetupSchema = z.object({
  region: z.string().optional(),
  displayName: z.string().optional(),
  fifoTopic: z.boolean().optional(),
  kmsMasterKeyId: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
  subscriptions: z.array(SetupSubscriptionSchema).optional(),
});

export type Setup = z.infer<typeof SetupSchema>;
export type SetupSubscription = z.infer<typeof SetupSubscriptionSchema>;
