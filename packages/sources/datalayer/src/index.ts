import type { Config } from './types';
import { intercept, push } from './push';
import { getDataLayer } from './helper';

export * as SourceDataLayer from './types';

export function sourceDataLayer(
  partialConfig: Partial<Config> = {},
): Config | undefined {
  const { elb, name, prefix = 'dataLayer', skipped = [] } = partialConfig;
  if (!elb) return;

  const dataLayer = getDataLayer(name);

  const config: Config = {
    ...partialConfig,
    elb,
    prefix,
    skipped,
  };

  // Override the original push function to intercept incoming events
  intercept(config);

  // Process already existing events in the dataLayer
  dataLayer.forEach((item) => push(config, item));

  return config;
}

export default sourceDataLayer;
