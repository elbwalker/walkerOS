import type { Settings, Destination } from './types';
import { isDefined } from '@walkeros/core';
import { sendWeb } from '@walkeros/web-core';

// Types
export * as DestinationAPI from './types';

// Examples
export * as examples from './examples';

export const destinationAPI: Destination = {
  type: 'api',

  config: {},

  push(event, { config, mapping, data, wrap }) {
    const { settings = {} as Settings } = config;
    const { url, headers, method, transform, transport = 'fetch' } = settings;

    if (!url) return;

    const eventData = isDefined(data) ? data : event;
    const body = transform
      ? transform(eventData, config, mapping) // Transform event data
      : JSON.stringify(eventData);

    const send = wrap('sendWeb', sendWeb) as typeof sendWeb;
    send(url, body, { headers, method, transport });
  },
};

export default destinationAPI;
