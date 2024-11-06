import type { WalkerOS } from '@elbwalker/types';
import type { Config, DataLayer } from './types';
import { tryCatch } from '@elbwalker/utils';

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
    tryCatch(() => {
      // Clone the arguments to avoid mutation
      const clonedArgs = deepClone(args);

      push(...clonedArgs);
    }, console.error)(...args);

    // Always call the original push function
    return originalPush(...args);
  };
}

function deepClone<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj))
    return obj.map((item) => deepClone(item)) as unknown as T;

  const clonedObj = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
}

export default { elbDataLayer };
