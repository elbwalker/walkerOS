import type { Destination } from './types';
import { throwError, tryCatchAsync } from '@elbwalker/utils';
import { push } from './push';
import { getConfig } from './config';

// Types
export * as DestinationNodeEtag from './types';

export const destinationEtag: Destination = {
  type: 'etag-node',

  config: {},

  async init(config, instance) {
    if (!config.custom || !config.custom.measurementId || !instance.session)
      return false;
  },

  async push(events, config) {
    return await tryCatchAsync(push, (error) => {
      if (config.onLog) config.onLog('Push error');

      throwError(error);
    })(events, getConfig(config));
  },
};

export default destinationEtag;
