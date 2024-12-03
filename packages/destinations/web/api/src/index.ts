import type { Destination } from './types';
import { isDefined, sendWeb } from '@elbwalker/utils';

// Types
export * as DestinationWebAPI from './types';

export const destinationWebAPI: Destination = {
  type: 'api',

  config: {},

  push(event, config, mapping, options = {}) {
    const {
      url,
      headers,
      method,
      transform,
      transport = 'fetch',
    } = config.custom || {};

    if (!url) return;

    const value = isDefined(options.data) ? options.data : event;
    const body = transform
      ? transform(value, config, mapping) // Transform event data
      : JSON.stringify(value);

    sendWeb(url, body, { headers, method, transport });
  },
};

export default destinationWebAPI;
