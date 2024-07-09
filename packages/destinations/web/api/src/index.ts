import type { Destination } from './types';
import { sendWeb } from '@elbwalker/utils';

// Types
export * as DestinationWebAPI from './types';

export const destinationWebAPI: Destination = {
  type: 'api',

  config: {},

  push(event, config, mapping) {
    const {
      url,
      headers,
      method,
      transform,
      transport = 'fetch',
    } = config.custom || {};

    if (!url) return;

    const data = transform
      ? transform(event, config, mapping) // Transform event data
      : JSON.stringify(event);

    sendWeb(url, data, { headers, method, transport });
  },
};

export default destinationWebAPI;
