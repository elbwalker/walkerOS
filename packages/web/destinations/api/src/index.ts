import type { Settings, Destination, Env } from './types';
import { isDefined } from '@walkeros/core';
import { getEnv, sendWeb } from '@walkeros/web-core';

// Types
export * as DestinationAPI from './types';

// Examples
export * as examples from './examples';

export const destinationAPI: Destination = {
  type: 'api',

  config: {},

  push(event, { config, mapping, data, env }) {
    const { settings = {} as Settings } = config;
    const { url, headers, method, transform, transport = 'fetch' } = settings;

    if (!url) return;

    const eventData = isDefined(data) ? data : event;
    const body = transform
      ? transform(eventData, config, mapping) // Transform event data
      : JSON.stringify(eventData);

    const sendWebFn = (env as Env)?.sendWeb || sendWeb;
    sendWebFn(url, body, { headers, method, transport });
  },
};

export default destinationAPI;
