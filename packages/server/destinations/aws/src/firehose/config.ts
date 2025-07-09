import type { Config, Settings, PartialConfig } from './types';
import { onLog } from '@walkerOS/core';
import { getConfigFirehose } from './lib/firehose';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = partialConfig.settings || ({} as Settings);

  if (settings.firehose)
    settings.firehose = getConfigFirehose(settings.firehose);

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { settings, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination AWS: ${message}`, verbose);
}
