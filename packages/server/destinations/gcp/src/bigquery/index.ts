import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationBigQuery from './types';

export const destinationBigQuery: Destination = {
  type: 'gcp-bigquery',

  config: {},

  async init({ config: partialConfig }) {
    const config = getConfig(partialConfig);

    return config;
  },

  async push(event, { config, mapping, data, collector, env }) {
    return await push(event, { config, mapping, data, collector, env });
  },
};

export default destinationBigQuery;
