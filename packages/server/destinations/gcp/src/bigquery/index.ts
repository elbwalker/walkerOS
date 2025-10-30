import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationBigQuery from './types';

// Examples
export * as examples from './examples';

// Schemas
export * as schemas from './schemas';

export const destinationBigQuery: Destination = {
  type: 'gcp-bigquery',

  config: {},

  async init({ config: partialConfig, env }) {
    const config = getConfig(partialConfig, env);

    return config;
  },

  async push(event, { config, mapping, data, collector, env }) {
    return await push(event, { config, mapping, data, collector, env });
  },
};

export default destinationBigQuery;
