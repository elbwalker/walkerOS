import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationBing from './types';

export const destinationBing: Destination = {
  type: 'bing',

  config: {},

  async init({ config: partialConfig }) {
    const config = getConfig(partialConfig);
    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationBing;
