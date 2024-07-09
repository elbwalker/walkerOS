import { sendWeb } from '@elbwalker/utils';
import type { Destination } from './types';

// Types
export * as DestinationWebAPI from './types';

export const destinationWebAPI: Destination = {
  type: 'api',

  config: {},

  push(event, config, mapping) {
    const custom = config.custom;
    if (!custom) return;

    const data = custom.transform
      ? custom.transform(event, config, mapping) // Transform event data
      : JSON.stringify(event);

    const options = {
      transport: custom.transport || 'fetch',
    };

    sendWeb(custom.url, data, options);
  },
};

export default destinationWebAPI;
