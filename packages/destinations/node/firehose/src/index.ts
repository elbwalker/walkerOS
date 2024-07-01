import type { CustomConfig, Destination } from './types';
import {
  isSameType,
  throwError,
  tryCatch,
  tryCatchAsync,
} from '@elbwalker/utils';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationFirehose from './types';

export const destinationFirehose: Destination = {
  config: {},

  async init(partialConfig) {
    const config = tryCatch(getConfig, (error) => {
      config.onLog('Init error', partialConfig.verbose);

      throwError(error);
    })(partialConfig);

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

export default destinationFirehose;
