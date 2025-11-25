import { z } from '@walkeros/core/dev';

export const SettingsSchema = z.object({
  client: z
    .any()
    .describe(
      'Google Cloud BigQuery client instance (like new BigQuery({ projectId, keyFilename }))',
    )
    .optional(),
  projectId: z
    .string()
    .min(1)
    .describe('Google Cloud Project ID (like my-gcp-project)'),
  datasetId: z
    .string()
    .min(1)
    .default('walkeros')
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
    .describe('Geographic location for the BigQuery dataset (like US)'),
  bigquery: z
    .any()
    .describe(
      'Additional BigQuery client configuration options (like { keyFilename: "path/to/key.json" })',
    )
    .optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
