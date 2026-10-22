import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationTwitter from './types';

export const destinationTwitter: Destination = {
  type: 'twitter',

  config: {},

  async init({ config: partialConfig }) {
    const config = getConfig(partialConfig);
    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationTwitter;
