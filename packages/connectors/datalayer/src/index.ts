import type { Config, DataLayer } from './types';
import { intercept, push } from './push';

export * as ConnectorDataLayer from './types';

export function connectorDataLayer(partialConfig: Partial<Config> = {}) {
  const { elb } = partialConfig;
  if (!elb) return;

  let { dataLayer } = partialConfig;

  if (!dataLayer) {
    const { name = 'dataLayer' } = partialConfig;
    const key = name as keyof Window;

    // Ensure the dataLayer exists
    if (!window[key]) (window[key] as unknown) = [];

    dataLayer = window[key] as DataLayer;
  }

  const config: Config = { ...partialConfig, elb, dataLayer };

  // Process already existing events in the dataLayer
  dataLayer.forEach((item) => push(config, item));

  // Override the original push function to intercept incoming events
  intercept(config);
}

export default connectorDataLayer;
