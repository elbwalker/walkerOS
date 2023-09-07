import type { CustomConfig } from './types';
import { BigQuery, type BigQueryOptions } from '@google-cloud/bigquery';
import { error } from './utils';

export function getCustomConfig(custom?: Partial<CustomConfig>): CustomConfig {
  if (!custom) error('Custom config missing');

  let { client, projectId, location, datasetId, tableId, bigquery } = custom;
  if (!projectId) error('Config custom projectId missing');

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
