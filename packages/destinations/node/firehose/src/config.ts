import { onLog } from '@elbwalker/utils';
import type { Config, CustomConfig, PartialConfig } from './types';

export function log(message: string, verbose?: boolean) {
  onLog(`Destination Firehose: ${message}`, verbose);
}

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const custom = partialConfig.custom || ({} as CustomConfig);

  const customConfig: CustomConfig = {
    ...custom,
  };

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { ...partialConfig, custom: customConfig, onLog };
}
