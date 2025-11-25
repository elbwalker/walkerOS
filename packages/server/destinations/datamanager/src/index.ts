import type { DestinationInterface } from './types';
import { getConfig } from './config';
import { push } from './push';
import { createAuthClient } from './auth';

export * as DestinationDataManager from './types';

export const destinationDataManager: DestinationInterface = {
  type: 'datamanager',

  config: {},

  async init({ config: partialConfig, env }) {
    const config = getConfig(partialConfig);

    if (!config.settings) {
      throw new Error('Settings required for Data Manager destination');
    }

    if (
      !config.settings.destinations ||
      config.settings.destinations.length === 0
    ) {
      throw new Error('At least one destination required in settings');
    }

    try {
      const authClient = await createAuthClient(config.settings);

      return {
        ...config,
        env: {
          ...env,
          authClient,
        },
      };
    } catch (error) {
      throw new Error(
        `Data Manager authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },

  async push(event, { config, mapping, data, collector, env }) {
    return await push(event, { config, mapping, data, collector, env });
  },
};

export default destinationDataManager;
