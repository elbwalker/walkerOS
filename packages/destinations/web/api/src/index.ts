import type { Custom, Destination } from './types';
import { isDefined, sendWeb } from '@elbwalker/utils';

// Types
export * as DestinationWebAPI from './types';

export const destinationWebAPI: Destination = {
  type: 'api',

  config: {},

  push(event, config, mapping, options = {}) {
    const { custom = {} as Custom, fn } = config;
    const { url, headers, method, transform, transport = 'fetch' } = custom;

    if (!url) return;

    const value = isDefined(options.data) ? options.data : event;
    const body = transform
      ? transform(value, config, mapping) // Transform event data
      : JSON.stringify(value);

    const func = fn || sendWeb;
    func(url, body, { headers, method, transport });
  },
};

export default destinationWebAPI;
