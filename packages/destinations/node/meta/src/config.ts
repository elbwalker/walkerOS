import type { Config, CustomConfig, PartialConfig } from './types';
import { onLog, throwError } from '@elbwalker/utils';

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const custom = partialConfig.custom || {};
  const { access_token, pixel_id } = custom;

  if (!access_token) throwError('Config custom access_token missing');
  if (!pixel_id) throwError('Config custom pixel_id missing');

  const customConfig: CustomConfig = {
    ...custom,
    access_token,
    pixel_id,
  };

  // Log Handler
  const onLog = (message: string) => log(message, partialConfig.verbose);

  return { custom: customConfig, onLog };
}

export function log(message: string, verbose?: boolean) {
  onLog(`Destination Meta: ${message}`, verbose);
}
