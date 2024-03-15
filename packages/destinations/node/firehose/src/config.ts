import { onLog, throwError } from '@elbwalker/utils';
import { FirehoseClient } from '@aws-sdk/client-firehose';
import type { FirehoseClientConfig } from '@aws-sdk/client-firehose';
import type { Config, CustomConfig, PartialConfig } from './types';

export function log(message: string, verbose?: boolean) {
  onLog(`Destination Firehose: ${message}`, verbose);
}

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const custom = partialConfig.custom || ({} as CustomConfig);
  const { firehose, streamName } = custom;
  let { client, region } = custom;

  if (!streamName) throwError('Config custom streamName missing');
  region = region || 'eu-central-1';

  const options: FirehoseClientConfig = firehose || {};
  if (!options.region) options.region = region;

  client = client || new FirehoseClient(options);

  const customConfig: CustomConfig = {
    ...custom,
    client,
    region,
    streamName,
  };

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { ...partialConfig, custom: customConfig, onLog };
}
