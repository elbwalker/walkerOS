import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationBigQuery from './types';

export const destinationBigQuery: Destination = {
  type: 'gcp-bigquery',

  config: {},

  async init({ config: partialConfig, env, logger }) {
    const config = getConfig(partialConfig, env, logger);

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationBigQuery;
