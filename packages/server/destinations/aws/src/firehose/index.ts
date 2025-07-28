import type { Settings, Destination } from './types';
import { isSameType } from '@walkeros/core';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationFirehose from './types';

export const destinationFirehose: Destination = {
  type: 'aws-firehose',

  config: {},

  async init({ config: partialConfig }) {
    const config = getConfig(partialConfig);

    if (!isSameType(config.settings, {} as Settings)) return false;

    return config;
  },

  async push(event, { config, collector, wrap }) {
    return await push(event, { config, collector, wrap });
  },
};

export default destinationFirehose;
