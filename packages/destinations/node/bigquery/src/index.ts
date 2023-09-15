import type { CustomConfig, Function } from './types';
import { isSameType, tryCatchAsync } from '@elbwalker/utils';
import { getCustomConfig } from './config';
import { setup } from './setup';
import { push } from './push';
import { throwError, log } from './utils';

export const destinationBigQuery: Function = {
  // meta: {
  //   name: 'BigQuery',
  //   version: '0.0.7',
  // },

  config: {},

  async setup(config) {
    return (
      (await tryCatchAsync(setup, (error) => {
        log({ message: 'Destination BigQuery setup error', error });
        throwError(error);
      })(getCustomConfig(config.custom))) || false
    );
  },

  async init(partialConfig) {
    const custom =
      (await tryCatchAsync(getCustomConfig, (error) => {
        log({ message: 'Destination BigQuery init error', error });
        throwError(error);
      })(partialConfig.custom)) || false;

    if (!isSameType(custom, {} as CustomConfig)) return false;

    return { ...partialConfig, custom };
  },

  async push(events, config) {
    return (
      (await tryCatchAsync(push, (error) => {
        log({ message: 'Destination BigQuery push error', error });
        // @TODO queue handling
        throwError(error);
      })(events, getCustomConfig(config.custom))) || {}
    );
  },
};

export default destinationBigQuery;
