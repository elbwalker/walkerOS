import type { WalkerOS } from '@elbwalker/types';
import type { Config, DataLayer } from './types';
import { intercept, push } from './push';

export * as ConnectorDataLayer from './types';

export function connectorDataLayer(elb: WalkerOS.Elb, config: Config = {}) {
  let { dataLayer } = config;

  if (!dataLayer) {
    const { name = 'dataLayer' } = config;
    const key = name as keyof Window;

    // Ensure the dataLayer exists
    if (!window[key]) (window[key] as unknown) = [];

    dataLayer = window[key] as DataLayer;
  }

  // Process already existing events in the dataLayer
  dataLayer.forEach((item) => push(elb, item));

  // Override the original push function to intercept incoming events
  intercept(dataLayer, elb);
}

export default connectorDataLayer;
