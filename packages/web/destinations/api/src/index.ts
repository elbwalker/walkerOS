import type { Settings, Destination, Environment } from './types';
import { isDefined } from '@walkeros/core';
import { sendWeb } from '@walkeros/web-core';

// Types
export * as DestinationAPI from './types';

// Examples
export * as examples from './examples';

export const destinationAPI: Destination = {
  type: 'api',

  config: {},

  env: {
    sendWeb,
  },

  push(event, { config, mapping, data, env }) {
    const { settings = {} as Settings } = config;
    const { url, headers, method, transform, transport = 'fetch' } = settings;

    if (!url) return;

    const eventData = isDefined(data) ? data : event;
    const body = transform
      ? transform(eventData, config, mapping) // Transform event data
      : JSON.stringify(eventData);

    const { sendWeb } = env as unknown as Environment;
    sendWeb(url, body, { headers, method, transport });
  },
};

export default destinationAPI;
