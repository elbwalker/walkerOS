import type { Destination } from './types';
import { throwError, tryCatchAsync } from '@elbwalker/utils';
import { push } from './push';
import { getConfig } from './config';

// Types
export * as DestinationNodeEtag from './types';

export const destinationEtag: Destination = {
  type: 'etag-node',

  config: {},

  async init(config = {}) {
    if (!config.custom || !config.custom.measurementId) return false;
  },

  async push(event, config) {
    return await tryCatchAsync(push, (error) => {
      if (config.onLog) config.onLog('Push error');

      throwError(error);
    })(event, getConfig(config));
  },
};

export default destinationEtag;
