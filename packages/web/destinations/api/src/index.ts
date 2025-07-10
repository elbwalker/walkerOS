import type { Settings, Destination } from './types';
import { isDefined, sendWeb } from '@walkerOS/web-collector';

// Types
export * as DestinationAPI from './types';

// Examples
export * as examples from './examples';

export const destinationAPI: Destination = {
  type: 'api',

  config: {},

  push(event, { config, mapping, data }) {
    const { settings = {} as Settings, fn } = config;
    const { url, headers, method, transform, transport = 'fetch' } = settings;

    if (!url) return;

    const eventData = isDefined(data) ? data : event;
    const body = transform
      ? transform(eventData, config, mapping) // Transform event data
      : JSON.stringify(eventData);

    const func = fn || sendWeb;
    func(url, body, { headers, method, transport });
  },
};

export default destinationAPI;
