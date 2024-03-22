import type { Destination } from './types';

// Types
export * as DestinationEtag from './types';

export const destinationEtag: Destination = {
  type: 'api',

  config: {},

  push(event, config, mapping) {
    console.log(event, config, mapping);
  },
};

export default destinationEtag;
