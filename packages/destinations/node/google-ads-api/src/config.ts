import type { Config, Custom, InitFn } from './types';
import { onLog } from '@elbwalker/utils';

export function getConfig(partialConfig: Parameters<InitFn>[0] = {}): Config {
  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { ...partialConfig, custom: {}, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination Ads API: ${message}`, verbose);
}
