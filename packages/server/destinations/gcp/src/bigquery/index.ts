import type { Destination } from './types';
import { throwError, tryCatchAsync } from '@walkerOS/server-collector';
import { getConfig, log } from './config';
import { push } from './push';

// Types
export * as DestinationBigQuery from './types';

export const destinationBigQuery: Destination = {
  config: {},

  async init(partialConfig = {}) {
    const config = await tryCatchAsync(getConfig, (error) => {
      log('Init error', partialConfig.verbose);

      throwError(error);
    })(partialConfig);

    return config;
  },

  async push(event, config, mapping, options) {
    return await tryCatchAsync(push, (error) => {
      if (config.onLog) config.onLog('Push error');
      // @TODO queue handling
      throwError(error);
    })(event, config, mapping, options);
  },
};

export default destinationBigQuery;
