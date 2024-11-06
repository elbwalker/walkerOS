import type { WalkerOS } from '@elbwalker/types';
import type { Config, DataLayer } from './types';
import { clone, tryCatch } from '@elbwalker/utils';

export * as ConnectorDataLayer from './types';

export function elbDataLayer(push: WalkerOS.Elb, config: Config = {}) {
  const { name = 'dataLayer' } = config;
  const key = name as keyof Window;

  // Ensure the dataLayer exists
  if (!window[key]) (window[key] as unknown) = [];

  const dataLayer = window[key] as DataLayer;

  // Store the original push function to preserve existing functionality
  const originalPush = dataLayer.push.bind(dataLayer);

  dataLayer.push = function (...args: unknown[]) {
    tryCatch((...args: unknown[]) => {
      // Clone the arguments to avoid mutation
      const clonedArgs = clone(args);

      // Map the incoming event to a WalkerOS event
      const event = mapPush(clonedArgs);

      // Hand over to walker instance
      push(event);
    })(args);

    // Always call the original push function
    return originalPush(...args);
  };
}

export default { elbDataLayer };

function mapPush(...clonedArgs: unknown[]): WalkerOS.PartialEvent {
  clonedArgs;

  // @TODO dummy return
  return { event: 'e a' };
}
