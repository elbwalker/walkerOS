import { onLog, throwError } from '@elbwalker/utils';
import type { Config, CustomConfig, PartialConfig } from './types';
import { BigQuery, type BigQueryOptions } from '@google-cloud/bigquery';

export function log(message: string, verbose?: boolean) {
  onLog(`Destination BigQuery: ${message}`, verbose);
}

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const custom = partialConfig.custom || ({} as CustomConfig);
  let { client, projectId, location, datasetId, tableId, bigquery } = custom;

  if (!projectId) throwError('Config custom projectId missing');

  const meta = {
    name: 'BigQuery',
    version: '1.0.0',
  };

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

  return { ...partialConfig, custom: customConfig, meta, onLog };
}
