import type { Config, Env, PartialConfig, Settings } from './types';
import type { BigQueryOptions } from '@google-cloud/bigquery';
import { throwError } from '@walkeros/core';
import { BigQuery } from '@google-cloud/bigquery';

export function getConfig(
  partialConfig: PartialConfig = {},
  env?: Env,
): Config {
  const settings = partialConfig.settings || ({} as Settings);
  const { projectId, bigquery } = settings;
  let { client, location, datasetId, tableId } = settings;

  if (!projectId) throwError('Config settings projectId missing');

  location = location || 'EU';
  datasetId = datasetId || 'walkeros';
  tableId = tableId || 'events';

  const options: BigQueryOptions = bigquery || {};
  options.projectId = projectId;

  // Use BigQuery from env if available, otherwise use real BigQuery
  const BigQueryClass = env?.BigQuery || BigQuery;
  client = client || new BigQueryClass(options);

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
