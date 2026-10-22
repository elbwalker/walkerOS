import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationPinterest from './types';

export const destinationPinterest: Destination = {
  type: 'pinterest',

  config: {},

  async init({ config: partialConfig }) {
    return getConfig(partialConfig);
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationPinterest;
