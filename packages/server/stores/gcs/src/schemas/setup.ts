import { z } from '@walkeros/core/dev';

export const SetupSchema = z
  .object({
    projectId: z
      .string()
      .optional()
      .describe(
        'GCP project that owns the bucket. Falls back to credentials.project_id then GOOGLE_CLOUD_PROJECT env',
      ),
    location: z
      .string()
      .default('EU')
      .describe('Geographic location (multi-region or region code)'),
    storageClass: z
      .enum(['STANDARD', 'NEARLINE', 'COLDLINE', 'ARCHIVE'])
      .default('STANDARD')
      .describe('Default storage class for objects'),
    versioning: z
      .boolean()
      .default(false)
      .describe('Enable object versioning at create time'),
    labels: z
      .record(z.string(), z.string())
      .optional()
      .describe('Labels for cost allocation'),
    kmsKeyName: z
      .string()
      .optional()
      .describe('Customer-managed encryption key for at-rest encryption'),
    // lifecycle rules intentionally omitted from this schema: the type is
    // deeply nested and not useful to autocomplete in MCP discovery for v1.
  })
  .describe(
    'Provisioning options for "walkeros setup store.<id>". Idempotent: never mutates an existing bucket.',
  );

export type Setup = z.infer<typeof SetupSchema>;
