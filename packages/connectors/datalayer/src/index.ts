import type { Config, DataLayer } from './types';
import { tryCatch } from '@elbwalker/utils';

export * as ConnectorDataLayer from './types';

export function elbDataLayer(config: Config = {}) {
  const { name = 'dataLayer' } = config;
  const key = name as keyof Window;

  // Initialize or get the dataLayer
  const dataLayer = (window[key] as DataLayer | undefined) || [];
  (window[key] as DataLayer) = dataLayer;

  // Store the original push function to preserve existing functionality
  const originalPush = dataLayer.push.bind(dataLayer);

  dataLayer.push = function (...args: unknown[]) {
    tryCatch(() => {
      // Clone the arguments to avoid mutation
      const clonedArgs = deepClone(args);

      console.log('Intercepted event:', clonedArgs);
    }, console.error);

    // Always call the original push function
    return originalPush(...args);
  };
}

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
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
