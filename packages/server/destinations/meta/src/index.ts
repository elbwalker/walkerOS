import type { Destination } from './types';
import { throwError, tryCatchAsync } from '@walkerOS/core';
import { getConfig, log } from './config';
import { push } from './push';

// Types
export * as DestinationMeta from './types';

// Examples
export * as destinationMetaExamples from './examples';

export const destinationMeta: Destination = {
  type: 'meta',

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
      if (config.onError) config.onError(error);
      throwError(error);
    })(event, config, mapping, options);
  },
};

export default destinationMeta;
