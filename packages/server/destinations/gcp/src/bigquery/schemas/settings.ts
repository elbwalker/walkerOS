import { z } from '@walkeros/core';

/**
 * GCP BigQuery Settings Schema
 * Configuration for Google Cloud BigQuery destination
 */
export const SettingsSchema = z.object({
  client: z
    .any()
    .describe('BigQuery client instance (from @google-cloud/bigquery)')
    .optional(),
  projectId: z.string().min(1).describe('GCP Project ID (required)'),
  datasetId: z
    .string()
    .min(1)
    .describe('BigQuery dataset ID (default: walkeros)')
    .optional(),
  tableId: z
    .string()
    .min(1)
    .describe('BigQuery table ID (default: events)')
    .optional(),
  location: z
    .string()
    .describe('BigQuery dataset location (default: EU)')
    .optional(),
  bigquery: z
    .any()
    .describe(
      'BigQueryOptions for client configuration (from @google-cloud/bigquery)',
    )
    .optional(),
});

/**
 * Type inference from SettingsSchema
 */
export type Settings = z.infer<typeof SettingsSchema>;
