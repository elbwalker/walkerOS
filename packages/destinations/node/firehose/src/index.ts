import type { Destination } from './types';
import { throwError, tryCatchAsync } from '@elbwalker/utils';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationFirehose from './types';

export const destinationFirehose: Destination = {
  config: {},

  async init() {
    return false;
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
