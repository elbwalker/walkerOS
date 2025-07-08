import type { Config, Settings, InitFn } from './types';
import { onLog } from '@walkerOS/utils';
import { getConfigFirehose } from './lib/firehose';

export function getConfig(partialConfig: Parameters<InitFn>[0] = {}): Config {
  const settings = partialConfig.settings || ({} as Settings);

  if (settings.firehose) settings.firehose = getConfigFirehose(settings.firehose);

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { settings, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination AWS: ${message}`, verbose);
}
