import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationTikTok from './types';

export const destinationTikTok: Destination = {
  type: 'tiktok',

  config: {},

  async init({ config: partialConfig, logger }) {
    const config = getConfig(partialConfig, logger);
    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationTikTok;
