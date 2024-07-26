import type { CustomConfig, Destination } from './types';
import { isSameType, throwError, tryCatchAsync } from '@elbwalker/utils';
import { getConfig, log } from './config';
import { push } from './push';
import { setup } from './setup';

// Types
export * as DestinationBigQuery from './types';

export const destinationBigQuery: Destination = {
  config: {},

  async init(partialConfig) {
    const config = await tryCatchAsync(getConfig, (error) => {
      log('Init error', partialConfig.verbose);

      throwError(error);
    })(partialConfig);

    // Only run setup if enabled
    // This checks if the dataset and table exists and creates them if not
    if (config.custom.runSetup) await setup(config);

    if (!isSameType(config.custom, {} as CustomConfig)) return false;

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
