import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationMeta from './types';

// Examples
export * as examples from './examples';

export const destinationMeta: Destination = {
  type: 'meta',

  config: {},

  async init({ config: partialConfig }) {
    const config = getConfig(partialConfig);
    return config;
  },

  async push(event, { config, mapping, data, collector, env }) {
    return await push(event, { config, mapping, data, collector, env });
  },
};

export default destinationMeta;
