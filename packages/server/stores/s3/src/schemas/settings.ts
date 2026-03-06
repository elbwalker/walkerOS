import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  bucket: z.string().min(1).describe('S3 bucket name'),
  endpoint: z
    .string()
    .url()
    .describe(
      'S3-compatible endpoint URL (like https://s3.eu-west-1.amazonaws.com)',
    ),
  accessKeyId: z.string().min(1).describe('S3 access key ID'),
  secretAccessKey: z.string().min(1).describe('S3 secret access key'),
  region: z.string().default('auto').describe('AWS region for SigV4 signing'),
  prefix: z
    .string()
    .optional()
    .describe('Key prefix prepended to all store keys for scoping'),
});

export type Settings = z.infer<typeof SettingsSchema>;
