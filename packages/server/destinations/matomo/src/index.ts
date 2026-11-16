import type { Destination } from './types';
import { sendServer } from '@walkeros/server-core';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationMatomo from './types';

export const destinationMatomo: Destination = {
  type: 'matomo',

  config: {},

  env: { sendServer },

  async init({ config }) {
    return getConfig(config);
  },

  push,
};

export default destinationMatomo;
