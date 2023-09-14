import type { Function } from './types';
import { getCustomConfig } from './config';
import { setup } from './setup';
import { push } from './push';

export const destinationBigQuery: Function = {
  // meta: {
  //   name: 'BigQuery',
  //   version: '0.0.7',
  // },

  config: {},

  async setup(config) {
    // @TODO trycatch
    return setup(getCustomConfig(config.custom));
  },

  async init(partialConfig) {
    const custom = getCustomConfig(partialConfig.custom);

    return { ...partialConfig, custom };
  },

  async push(events, config) {
    // @TODO trycatch
    return push(events, getCustomConfig(config.custom));
  },
};

export default destinationBigQuery;
