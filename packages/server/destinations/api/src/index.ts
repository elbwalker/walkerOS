import type { Settings, Destination, Environment } from './types';
import { isDefined } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';

// Types
export * as DestinationAPI from './types';

// Examples
export * as examples from './examples';

export const destinationAPI: Destination = {
  type: 'api',

  config: {},

  env: { sendServer },

  async push(event, { config, mapping, data, env }) {
    const { settings = {} as Settings } = config;
    const { url, headers, method, transform, timeout } = settings;

    if (!url) return;

    const eventData = isDefined(data) ? data : event;
    const body = transform
      ? transform(eventData, config, mapping) // Transform event data
      : JSON.stringify(eventData);

    const sendServerFn = (env as Environment)?.sendServer || sendServer;
    await sendServerFn(url, body, { headers, method, timeout });
  },
};

export default destinationAPI;
