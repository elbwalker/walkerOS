import type { Config, CustomConfig, PartialConfig } from './types';
import type { BigQueryOptions } from '@google-cloud/bigquery';
import { onLog, throwError } from '@elbwalker/utils';
import { BigQuery } from '@google-cloud/bigquery';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const custom = partialConfig.custom || {};
  const { projectId, bigquery } = custom;
  let { client, location, datasetId, tableId } = custom;

  if (!projectId) throwError('Config custom projectId missing');

  location = location || 'EU';
  datasetId = datasetId || 'walkeros';
  tableId = tableId || 'events';

  const options: BigQueryOptions = bigquery || {};
  if (projectId) options.projectId = projectId;

  client = client || new BigQuery(options);

  const customConfig: CustomConfig = {
    ...custom,
    client,
    projectId,
    location,
    datasetId,
    tableId,
  };

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { ...partialConfig, custom: customConfig, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination BigQuery: ${message}`, verbose);
}
