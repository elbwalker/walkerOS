import type { Destination } from './types';
import { throwError, tryCatchAsync } from '@elbwalker/utils';
import { getConfig, log } from './config';
import { push } from './push';

// Types
export * as DestinationBigQuery from './types';

export const destinationBigQuery: Destination = {
  config: {},

  async init(partialConfig) {
    const config = await tryCatchAsync(getConfig, (error) => {
      log('Init error', partialConfig.verbose);

      throwError(error);
    })(partialConfig);

    return config;
  },

  async push(events, config) {
    return await tryCatchAsync(push, (error) => {
      if (config.onLog) config.onLog('Push error');
      // @TODO queue handling
      throwError(error);
    })(events, getConfig(config));
  },
};

export default destinationBigQuery;
