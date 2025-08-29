import type { Config, Settings, PartialConfig } from './types';
import { getConfigFirehose } from './lib/firehose';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = partialConfig.settings || ({} as Settings);

  if (settings.firehose)
    settings.firehose = getConfigFirehose(settings.firehose);

  return { settings };
}
