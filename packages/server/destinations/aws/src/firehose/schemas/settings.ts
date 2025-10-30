import { z } from '@walkeros/core';

/**
 * Firehose Configuration Schema
 * Nested configuration for AWS Kinesis Firehose
 */
export const FirehoseConfigSchema = z.object({
  streamName: z.string().min(1).describe('AWS Kinesis Firehose stream name'),
  client: z
    .any()
    .describe('AWS FirehoseClient instance (from @aws-sdk/client-firehose)')
    .optional(),
  region: z
    .string()
    .describe('AWS region (e.g., us-east-1, eu-west-1)')
    .optional(),
  config: z
    .any()
    .describe('AWS FirehoseClientConfig (from @aws-sdk/client-firehose)')
    .optional(),
});

/**
 * AWS Firehose Settings Schema
 * Configuration for AWS Kinesis Firehose destination
 */
export const SettingsSchema = z.object({
  firehose: FirehoseConfigSchema.describe(
    'AWS Kinesis Firehose configuration',
  ).optional(),
});

/**
 * Type inference from SettingsSchema
 */
export type Settings = z.infer<typeof SettingsSchema>;
