import { z } from '@walkeros/core/dev';

/**
 * GCP Pub/Sub Setup Schema
 *
 * Provisioning options for `walkeros setup destination.<id>`. Idempotent topic
 * creation. Subscription provisioning is owned by the source side.
 */
export const SetupSchema = z.object({
  messageStoragePolicy: z
    .object({
      allowedPersistenceRegions: z
        .array(z.string())
        .describe(
          'Geographic regions for at-rest message storage. Default: EU multi-region (eu-west1, eu-west3, eu-west4).',
        ),
    })
    .describe('Topic-level message storage policy.')
    .optional(),
  messageRetentionDuration: z
    .object({
      seconds: z
        .number()
        .describe('Retention window in seconds. Default: project default.'),
    })
    .describe('Topic-level retention configuration.')
    .optional(),
  kmsKeyName: z
    .string()
    .describe('Customer-managed encryption key (CMEK) resource name. Optional.')
    .optional(),
  labels: z
    .record(z.string(), z.string())
    .describe('Topic labels for organization and billing.')
    .optional(),
});

export type Setup = z.infer<typeof SetupSchema>;
