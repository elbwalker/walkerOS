import type { Config, Settings, PartialConfig, Environment } from './types';
import { getConfigFirehose } from './lib/firehose';

export function getConfig(
  partialConfig: PartialConfig = {},
  env?: unknown,
): Config {
  const settings = partialConfig.settings || ({} as Settings);

  if (settings.firehose)
    settings.firehose = getConfigFirehose(settings.firehose, env);

  return { settings };
}
