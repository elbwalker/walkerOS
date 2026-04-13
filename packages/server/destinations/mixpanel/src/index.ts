import type { Destination } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationMixpanel from './types';

export const destinationMixpanel: Destination = {
  type: 'mixpanel',

  config: {},

  async init({ config: partialConfig, env, logger }) {
    const config = getConfig(partialConfig, env, logger);
    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  destroy({ config }) {
    // SDK fires immediately — no flush/close needed.
    // Just clear the client reference.
    if (config?.settings) {
      config.settings.client = undefined;
    }
  },
};

export default destinationMixpanel;
