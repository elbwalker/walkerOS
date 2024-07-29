import type { Config, CustomConfig, PartialConfig } from './types';
import { onLog, throwError } from '@elbwalker/utils';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const custom = partialConfig.custom || {};
  const { measurementId } = custom;

  if (!measurementId) throwError('Config custom measurementId missing');

  const customConfig: CustomConfig = {
    ...custom,
    measurementId,
  };

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { ...partialConfig, custom: customConfig, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination etag: ${message}`, verbose);
}
