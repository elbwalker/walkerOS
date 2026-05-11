import type { Config, PartialConfig, Settings } from './types';
import { getConfigSNS } from './lib/sns';

export function getConfig(partial: PartialConfig = {}, env?: unknown): Config {
  const partialSettings: Partial<Settings> =
    partial.settings && typeof partial.settings === 'object'
      ? partial.settings
      : {};
  const settings = getConfigSNS(partialSettings, env);
  return { ...partial, settings };
}
