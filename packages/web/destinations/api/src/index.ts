import type { Settings, Destination } from './types';
import { isDefined } from '@walkerOS/core';
import { sendWeb } from '@walkerOS/web-collector';

// Types
export * as DestinationAPI from './types';

// Examples
export * as examples from './examples';

export const destinationAPI: Destination = {
  type: 'api',

  config: {},

  push(event, config, mapping, options = {}) {
    const { settings = {} as Settings, fn } = config;
    const { url, headers, method, transform, transport = 'fetch' } = settings;

    if (!url) return;

    const data = isDefined(options.data) ? options.data : event;
    const body = transform
      ? transform(data, config, mapping) // Transform event data
      : JSON.stringify(data);

    const func = fn || sendWeb;
    func(url, body, { headers, method, transport });
  },
};

export default destinationAPI;
