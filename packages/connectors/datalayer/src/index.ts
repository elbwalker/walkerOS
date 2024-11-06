import type { WalkerOS } from '@elbwalker/types';
import type { Config, DataLayer } from './types';
import { interceptPush } from './intercept';

export * as ConnectorDataLayer from './types';

export function elbDataLayer(push: WalkerOS.Elb, config: Config = {}) {
  const { name = 'dataLayer' } = config;
  const key = name as keyof Window;

  // Ensure the dataLayer exists
  if (!window[key]) (window[key] as unknown) = [];

  const dataLayer = window[key] as DataLayer;

  // Store the original push function to preserve existing functionality
  const originalPush = dataLayer.push.bind(dataLayer);

  // Override the original push function to intercept incoming events
  dataLayer.push = interceptPush(originalPush, push);
}

export default { elbDataLayer };
