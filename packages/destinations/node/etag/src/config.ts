import type { Config, Custom, InitFn } from './types';
import { onLog, throwError } from '@elbwalker/utils';

export function getConfig(partialConfig: Parameters<InitFn>[0] = {}): Config {
  const custom = partialConfig.custom || {};
  const { measurementId } = custom;

  if (!measurementId) throwError('Config custom measurementId missing');

  const customConfig: Custom = {
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
