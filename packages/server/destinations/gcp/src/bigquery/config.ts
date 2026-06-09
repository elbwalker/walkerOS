import type { Config, Env, PartialConfig, Settings } from './types';
import type { BigQueryOptions } from '@google-cloud/bigquery';
import type { Logger } from '@walkeros/core';
import { BigQuery } from '@google-cloud/bigquery';
import { parseCredentials } from '../pubsub/config';

export function getConfig(
  partialConfig: PartialConfig = {},
  env: Env | undefined,
  logger: Logger.Instance,
): Config {
  const settings = partialConfig.settings || ({} as Settings);
  const { projectId, bigquery } = settings;
  let { client, location, datasetId, tableId } = settings;

  if (!projectId) logger.throw('Config settings projectId missing');

  location = location || 'EU';
  datasetId = datasetId || 'walkerOS';
  tableId = tableId || 'events';

  const options: BigQueryOptions = { ...(bigquery || {}) };
  options.projectId = projectId;

  // `config.credentials` (parse-if-string) merges into the client options.
  // `settings.bigquery` stays the raw passthrough escape hatch.
  const credentials = parseCredentials(partialConfig.credentials, logger);
  if (credentials !== undefined && typeof credentials !== 'string') {
    options.credentials = credentials;
  }

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
