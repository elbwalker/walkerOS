import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationBigQuery from './types';

export const destinationBigQuery: Destination = {
  type: 'gcp-bigquery',

  config: {},

  async init({ config: partialConfig, env }) {
    const config = getConfig(partialConfig, env);

    return config;
  },

  async push(event, { config, mapping, data, collector, env, logger }) {
    return await push(event, { config, mapping, data, collector, env, logger });
  },
};

export default destinationBigQuery;
