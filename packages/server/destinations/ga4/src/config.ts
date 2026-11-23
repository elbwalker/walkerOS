import type { Config, Settings, PartialConfig } from './types';
import { StepError } from '@walkeros/core';

const MEASUREMENT_ID = /^G-[A-Z0-9]+$/;

export function getConfig(partialConfig: PartialConfig = {}): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { measurementId, apiSecret } = settings;

  if (!measurementId || !apiSecret) {
    const missing = [
      ...(measurementId ? [] : ['measurementId']),
      ...(apiSecret ? [] : ['apiSecret']),
    ];
    throw new StepError(`Config settings ${missing.join(', ')} missing`, {
      code: 'config',
    });
  }
  if (!MEASUREMENT_ID.test(measurementId))
    throw new StepError('Config settings measurementId must look like G-XXXX', {
      code: 'config',
    });

  return {
    ...partialConfig,
    settings: { ...settings, measurementId, apiSecret },
  };
}
