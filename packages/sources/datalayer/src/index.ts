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

  if (!dataLayer) return;

  const config: Config = {
    ...partialConfig,
    elb,
    prefix,
    skipped,
  };

  // Override the original push function to intercept incoming events
  intercept(config);

  // Process already existing events in the dataLayer (ignore Promise handling)
  dataLayer.map((item) => push(config, false, item));

  return config;
}

export default sourceDataLayer;
