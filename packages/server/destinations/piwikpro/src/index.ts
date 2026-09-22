import type { Destination } from './types';
import { sendServer } from '@walkeros/server-core';
import { getConfig } from './config';
import { push, pushBatch } from './push';

// Types
export * as DestinationPiwikPro from './types';

export const destinationPiwikPro: Destination = {
  type: 'piwikpro',

  config: {},

  env: { sendServer },

  async init({ config, logger }) {
    return getConfig(config, logger);
  },

  push,

  pushBatch,
};

export default destinationPiwikPro;
