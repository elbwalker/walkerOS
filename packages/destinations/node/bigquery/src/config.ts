import type { CustomConfig } from './types';
import { BigQuery, type BigQueryOptions } from '@google-cloud/bigquery';
import { throwError } from './utils';

export function getCustomConfig(
  custom: Partial<CustomConfig> = {},
): CustomConfig {
  let { client, projectId, location, datasetId, tableId, bigquery } = custom;
  if (!projectId) throwError('Config custom projectId missing');

  location = location || 'EU';
  datasetId = datasetId || 'walkeros';
  tableId = tableId || 'events';

  const options: BigQueryOptions = bigquery || {};
  if (projectId) options.projectId = projectId;

  client = client || new BigQuery(options);

  const customConfig: CustomConfig = {
    client,
    projectId,
    location,
    datasetId,
    tableId,
  };

  return customConfig;
}
