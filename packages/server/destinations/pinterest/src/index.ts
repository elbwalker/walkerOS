import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationPinterest from './types';

export const destinationPinterest: Destination = {
  type: 'pinterest',

  config: {},

  async init({ config: partialConfig, logger }) {
    const config = getConfig(partialConfig, logger);
    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationPinterest;
