import type { CustomConfig, Function } from './types';
import { isSameType, tryCatchAsync } from '@elbwalker/utils';
import { getCustomConfig } from './config';
import { setup } from './setup';
import { push } from './push';
import { throwError, log } from './utils';

const meta = {
  name: 'BigQuery',
  version: '0.0.7',
};

// Types
export * as DestinationBigQuery from './types';

export const destinationBigQuery: Function = {
  config: {},

  async setup(config) {
    return await tryCatchAsync(setup, (error) => {
      log({ message: 'Destination BigQuery setup error', error });
      throwError(error);
    })(getCustomConfig(config.custom));
  },

  async init(partialConfig) {
    const custom = await tryCatchAsync(getCustomConfig, (error) => {
      log({ message: 'Destination BigQuery init error', error });
      throwError(error);
    })(partialConfig.custom);

    if (!isSameType(custom, {} as CustomConfig)) return false;

    return { ...partialConfig, custom, meta };
  },

  async push(events, config) {
    return await tryCatchAsync(push, (error) => {
      log({ message: 'Destination BigQuery push error', error });
      // @TODO queue handling
      throwError(error);
    })(events, getCustomConfig(config.custom));
  },
};

export default destinationBigQuery;
