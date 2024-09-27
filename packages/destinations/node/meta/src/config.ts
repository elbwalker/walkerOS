import type { Config, CustomConfig, PartialConfig } from './types';
import { onLog } from '@elbwalker/utils';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const custom: CustomConfig = {};
  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { custom, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination Meta: ${message}`, verbose);
}
