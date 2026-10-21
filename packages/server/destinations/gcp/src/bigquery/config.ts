import type { Config, Env, PartialConfig, Settings } from './types';
import type { BigQueryOptions } from '@google-cloud/bigquery';
import type { Logger } from '@walkeros/core';
import { StepError } from '@walkeros/core';
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

  if (!projectId)
    throw new StepError('Config settings projectId missing', {
      code: 'config',
    });

  location = location || 'EU';
  datasetId = datasetId || 'walkerOS';
  tableId = tableId || 'events';

  const options: BigQueryOptions = { ...(bigquery || {}) };
  options.projectId = projectId;

  // `config.credentials` (parse-if-string) merges into the client options.
  // `settings.bigquery` stays the raw passthrough escape hatch.
  const parsed = parseCredentials(partialConfig.credentials);
  // parseCredentials returns the object form (or undefined); an invalid JSON
  // string throws a config StepError.
  const credentials =
    parsed !== undefined && typeof parsed !== 'string' ? parsed : undefined;
  if (credentials !== undefined) {
    options.credentials = credentials;
  }

  // Use BigQuery from env if available, otherwise use real BigQuery
  const BigQueryClass: NonNullable<Env['BigQuery']> = env?.BigQuery || BigQuery;
  client = client || new BigQueryClass(options);

  const settingsConfig: Settings = {
    ...settings,
    client,
    projectId,
    location,
    datasetId,
    tableId,
    // Stored so init() can thread the same SA to the Storage Write client.
    ...(credentials !== undefined ? { credentials } : {}),
  };

  return { ...partialConfig, settings: settingsConfig };
}
