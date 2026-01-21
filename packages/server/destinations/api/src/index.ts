import type { Settings, Destination, Env } from './types';
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

  async push(event, { config, rule, data, env, logger }) {
    const { settings } = config;
    const { url, headers, method, transform, timeout } = settings || {};

    if (!url) return;

    const eventData = isDefined(data) ? data : event;
    const body = transform
      ? transform(eventData, config, rule) // Transform event data
      : JSON.stringify(eventData);

    logger?.debug('API destination sending request', {
      url,
      method: method || 'POST',
      eventName: event.name,
    });

    const sendServerFn = (env as Env)?.sendServer || sendServer;
    const response = await sendServerFn(url, body, {
      headers,
      method,
      timeout,
    });

    logger?.debug('API destination response', { ok: response?.ok });
  },
};

export default destinationAPI;
