import type { Config, Custom, InitFn } from './types';
import type { BigQueryOptions } from '@google-cloud/bigquery';
import { onLog, throwError } from '@walkerOS/utils';
import { BigQuery } from '@google-cloud/bigquery';

export function getConfig(partialConfig: Parameters<InitFn>[0] = {}): Config {
  const custom = partialConfig.custom || ({} as Custom);
  const { projectId, bigquery } = custom;
  let { client, location, datasetId, tableId } = custom;

  if (!projectId) throwError('Config custom projectId missing');

  location = location || 'EU';
  datasetId = datasetId || 'walkeros';
  tableId = tableId || 'events';

  const options: BigQueryOptions = bigquery || {};
  options.projectId = projectId;

  client = client || new BigQuery(options);

  const customConfig: Custom = {
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
