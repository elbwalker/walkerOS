import type { Settings, Destination } from './types';
import { isSameType } from '@walkeros/core';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationFirehose from './types';

export const destinationFirehose: Destination = {
  type: 'aws-firehose',

  config: {},

  async init({ config: partialConfig, env, logger }) {
    const config = getConfig(partialConfig, env);

    if (!isSameType(config.settings, {} as Settings))
      logger.throw('Config settings invalid');

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationFirehose;
