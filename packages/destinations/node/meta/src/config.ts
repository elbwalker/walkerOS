import type { Config, CustomConfig, PartialConfig } from './types';
import { onLog, throwError } from '@elbwalker/utils';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const custom = partialConfig.custom || {};
  const { accessToken, pixelId } = custom;

  if (!accessToken) throwError('Config custom accessToken missing');
  if (!pixelId) throwError('Config custom pixelId missing');

  const customConfig: CustomConfig = {
    ...custom,
    accessToken,
    pixelId,
  };

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { custom: customConfig, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination Meta: ${message}`, verbose);
}
