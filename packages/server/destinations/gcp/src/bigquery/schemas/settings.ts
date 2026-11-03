import { z } from '@walkeros/core/dev';

export const SettingsSchema = z
  .object({
    client: z
      .any()
      .describe(
        'Google Cloud BigQuery client instance (like new BigQuery({ projectId, keyFilename })). Used by walkeros setup only; event writes authenticate with config.credentials, settings.bigquery or the default credentials.',
      )
      .optional(),
    projectId: z
      .string()
      .min(1)
      .describe('Google Cloud Project ID (like my-gcp-project)'),
    datasetId: z
      .string()
      .min(1)
      .default('walkerOS')
      .describe(
        'BigQuery dataset ID where events will be stored (like walker_events)',
      ),
    tableId: z
      .string()
      .min(1)
      .default('events')
      .describe('BigQuery table ID for event storage (like events)'),
    location: z
      .string()
      .default('EU')
      .describe(
        'Not read by the destination. walkeros setup creates the dataset in config.setup.location (like US), default EU.',
      ),
    bigquery: z
      .any()
      .describe(
        'Additional BigQuery client configuration options (like { keyFilename: "path/to/key.json" })',
      )
      .optional(),
  })
  .strict();

export type Settings = z.infer<typeof SettingsSchema>;
