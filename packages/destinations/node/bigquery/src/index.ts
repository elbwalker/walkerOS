import type { CustomConfig, Function } from './types';
import { isSameType, tryCatchAsync } from '@elbwalker/utils';
import { getCustomConfig } from './config';
import { setup } from './setup';
import { push } from './push';
import { log } from './utils';

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
        return false;
      })(getCustomConfig(config.custom))) || false
    );
  },

  async init(partialConfig) {
    const custom =
      (await tryCatchAsync(getCustomConfig, (error) => {
        log({ message: 'Destination BigQuery init error', error });
        return false;
      })(partialConfig.custom)) || false;

    if (!isSameType(custom, {} as CustomConfig)) return false;

    return { ...partialConfig, custom };
  },

  async push(events, config) {
    // @TODO trycatch
    return push(events, getCustomConfig(config.custom));
  },
};

export default destinationBigQuery;
