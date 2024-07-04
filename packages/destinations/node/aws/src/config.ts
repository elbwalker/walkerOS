import type { Config, CustomConfig, PartialConfig } from './types';
import { onLog } from '@elbwalker/utils';
import { getConfigFirehose } from './lib/firehose';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const custom = partialConfig.custom || ({} as CustomConfig);

  if (custom.firehose) custom.firehose = getConfigFirehose(custom.firehose);

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { custom, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination AWS: ${message}`, verbose);
}
