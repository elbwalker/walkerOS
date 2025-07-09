import type { Config, Settings, PartialConfig } from './types';
import { onLog, throwError } from '@walkerOS/utils';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { accessToken, pixelId } = settings;

  if (!accessToken) throwError('Config settings accessToken missing');
  if (!pixelId) throwError('Config settings pixelId missing');

  const settingsConfig: Settings = {
    ...settings,
    accessToken,
    pixelId,
  };

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { ...partialConfig, settings: settingsConfig, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination Meta: ${message}`, verbose);
}
