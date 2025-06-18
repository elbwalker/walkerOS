import type { Config, Custom, InitFn } from './types';
import { onLog } from '@walkerOS/utils';
import { getConfigFirehose } from './lib/firehose';

export function getConfig(partialConfig: Parameters<InitFn>[0] = {}): Config {
  const custom = partialConfig.custom || ({} as Custom);

  if (custom.firehose) custom.firehose = getConfigFirehose(custom.firehose);

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { custom, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination AWS: ${message}`, verbose);
}
