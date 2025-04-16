import type { Destination } from './types';
import { throwError, tryCatchAsync } from '@elbwalker/utils';
import { getConfig, log } from './config';
import { push } from './push';

// Types
export * as DestinationAdsApi from './types';

export const destinationGoogleAdsApi: Destination = {
  type: 'google-ads-api',

  config: {},

  async init(partialConfig = {}) {
    const config = await tryCatchAsync(getConfig, (error) => {
      log('Init error', partialConfig.verbose);

      throwError(error);
    })(partialConfig);

    return config;
  },

  async push(event, config, mapping) {
    return await tryCatchAsync(push, (error) => {
      if (config.onLog) config.onLog('Push error');
      // @TODO queue handling
      throwError(error);
    })(event, config, mapping);
  },
};

export default destinationGoogleAdsApi;
