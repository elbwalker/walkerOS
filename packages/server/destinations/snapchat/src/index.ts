import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationSnapchat from './types';

export const destinationSnapchat: Destination = {
  type: 'snapchat',

  config: {},

  async init({ config: partialConfig }) {
    const config = getConfig(partialConfig);
    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationSnapchat;
