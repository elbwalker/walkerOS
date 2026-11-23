import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationReditus from './types';

export const destinationReditus: Destination = {
  type: 'reditus',

  config: {},

  async init({ config: partialConfig }) {
    return getConfig(partialConfig);
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationReditus;
