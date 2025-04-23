import type { Config } from './types';
import { intercept, push } from './push';
import { getDataLayer } from './helper';

export * as SourceDataLayer from './types';

export async function sourceDataLayer(
  partialConfig: Partial<Config> = {},
): Promise<Config | undefined> {
  const { elb, name, prefix = 'dataLayer', skipped = [] } = partialConfig;
  if (!elb) return;

  const dataLayer = getDataLayer(name);

  if (!dataLayer) return;

  const config: Config = {
    ...partialConfig,
    elb,
    prefix,
    skipped,
  };

  // Override the original push function to intercept incoming events
  intercept(config);

  // Process existing events (and only those)
  const length = dataLayer.length;
  for (let i = 0; i < length; i++) {
    await push(config, false, dataLayer[i]);
  }

  config.processing = false;

  return config;
}

export default sourceDataLayer;
