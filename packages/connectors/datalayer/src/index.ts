import type { WalkerOS } from '@elbwalker/types';
import type { Config, DataLayer } from './types';
import { intercept, push } from './push';

export * as ConnectorDataLayer from './types';

export function connectorDataLayer(elb: WalkerOS.Elb, config: Config = {}) {
  const { name = 'dataLayer' } = config;
  const key = name as keyof Window;

  // Ensure the dataLayer exists
  if (!window[key]) (window[key] as unknown) = [];

  const dataLayer = window[key] as DataLayer;

  // Store the original push function to preserve existing functionality
  const dataLayerPush = dataLayer.push.bind(dataLayer);

  // Override the original push function to intercept incoming events
  dataLayer.push = intercept(dataLayerPush, elb);

  // Process already existing events in the dataLayer
  dataLayer.forEach((item) => push(elb, item));
}

export default connectorDataLayer;
