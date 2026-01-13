import type { Settings, Destination, Env } from './types';
import { isDefined } from '@walkeros/core';
import { getEnv, sendWeb } from '@walkeros/web-core';

// Types
export * as DestinationAPI from './types';

export const destinationAPI: Destination = {
  type: 'api',

  config: {},

  push(event, { config, rule, data, env, logger }) {
    const { settings } = config;
    const {
      url,
      headers,
      method,
      transform,
      transport = 'fetch',
    } = settings || {};

    if (!url) logger.throw('Config settings url missing');

    const eventData = isDefined(data) ? data : event;
    const body = transform
      ? transform(eventData, config, rule) // Transform event data
      : JSON.stringify(eventData);

    const sendWebFn = (env as Env)?.sendWeb || sendWeb;
    sendWebFn(url!, body, { headers, method, transport });
  },
};

export default destinationAPI;
