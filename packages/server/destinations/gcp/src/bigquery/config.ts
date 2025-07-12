import type { Config, PartialConfig, Settings } from './types';
import type { BigQueryOptions } from '@google-cloud/bigquery';
import { throwError } from '@walkerOS/core';
import { BigQuery } from '@google-cloud/bigquery';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = partialConfig.settings || ({} as Settings);
  const { projectId, bigquery } = settings;
  let { client, location, datasetId, tableId } = settings;

  if (!projectId) throwError('Config settings projectId missing');

  location = location || 'EU';
  datasetId = datasetId || 'walkeros';
  tableId = tableId || 'events';

  const options: BigQueryOptions = bigquery || {};
  options.projectId = projectId;

  client = client || new BigQuery(options);

  const settingsConfig: Settings = {
    ...settings,
    client,
    projectId,
    location,
    datasetId,
    tableId,
  };

  return { ...partialConfig, settings: settingsConfig };
}
