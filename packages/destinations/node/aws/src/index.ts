import type { CustomConfig, Destination } from './types';
import { isSameType, throwError, tryCatchAsync } from '@elbwalker/utils';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationFirehose from './types';

export const destinationFirehose: Destination = {
  type: 'aws',

  config: {},

  async init(partialConfig) {
    const config = await tryCatchAsync(getConfig, (error) => {
      config.onLog('Init error', partialConfig.verbose);

      throwError(error);
    })(partialConfig);

    if (!isSameType(config.custom, {} as CustomConfig)) return false;

    return config;
  },

  async push(event, config) {
    return await tryCatchAsync(push, (error) => {
      if (config.onLog) config.onLog('Push error');

      throwError(error);
    })(event, getConfig(config));
  },
};

export default destinationFirehose;
