import type { DestinationInterface } from './types';
import { getConfig } from './config';
import { push } from './push';
import { createAuthClient } from './auth';

export * as DestinationDataManager from './types';

export const destinationDataManager: DestinationInterface = {
  type: 'datamanager',

  config: {},

  async init({ config: partialConfig, env, logger }) {
    const config = getConfig(partialConfig, logger);

    if (!config.settings) {
      logger.throw('Settings required for Data Manager destination');
    }

    if (
      !config.settings.destinations ||
      config.settings.destinations.length === 0
    ) {
      logger.throw('At least one destination required in settings');
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
      logger.throw(
        `Data Manager authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },

  async push(event, { config, mapping, data, collector, env, logger }) {
    return await push(event, { config, mapping, data, collector, env, logger });
  },
};

export default destinationDataManager;
