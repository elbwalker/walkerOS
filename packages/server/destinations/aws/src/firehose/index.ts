import type { Settings, Destination } from './types';
import {
  isSameType,
  throwError,
  tryCatchAsync,
} from '@walkerOS/server-collector';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationFirehose from './types';

export const destinationFirehose: Destination = {
  type: 'aws-firehose',

  config: {},

  async init({ config: partialConfig }) {
    const config = await tryCatchAsync(getConfig, (error) => {
      config.onLog('Init error', partialConfig?.verbose);

      throwError(error);
    })(partialConfig);

    if (!isSameType(config.settings, {} as Settings)) return false;

    return config;
  },

  async push(event, { config, collector, wrap }) {
    return await tryCatchAsync(push, (error) => {
      if (config.onLog) config.onLog('Push error');

      throwError(error);
    })(event, { config, collector, wrap });
  },
};

export default destinationFirehose;
