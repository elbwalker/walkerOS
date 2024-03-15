import { onLog } from '@elbwalker/utils';
import { FirehoseClient } from '@aws-sdk/client-firehose';
import type { FirehoseClientConfig } from '@aws-sdk/client-firehose';
import type { Config, CustomConfig, PartialConfig } from './types';

export function log(message: string, verbose?: boolean) {
  onLog(`Destination Firehose: ${message}`, verbose);
}

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const custom = partialConfig.custom || ({} as CustomConfig);
  const { firehose } = custom;
  let { client } = custom;

  const options: FirehoseClientConfig = firehose || {};

  client = client || new FirehoseClient(options);

  const customConfig: CustomConfig = {
    ...custom,
    client,
  };

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { ...partialConfig, custom: customConfig, onLog };
}
