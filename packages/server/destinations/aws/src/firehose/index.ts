import type { Settings, Destination } from './types';
import { isSameType } from '@walkeros/core';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationFirehose from './types';

export const destinationFirehose: Destination = {
  type: 'aws-firehose',

  config: {},

  async init({ config: partialConfig, env }) {
    const config = getConfig(partialConfig, env);

    if (!isSameType(config.settings, {} as Settings)) return false;

    return config;
  },

  async push(event, { config, collector, env }) {
    return await push(event, { config, collector, env });
  },
};

export default destinationFirehose;
