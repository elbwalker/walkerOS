import type { DestinationInterface } from './types';
import { getConfig } from './config';
import { push } from './push';
import { createAuthClient } from './auth';

export * as DestinationDataManager from './types';

export const destinationDataManager: DestinationInterface = {
  type: 'datamanager',

  config: {},

  async init({ config: partialConfig, env, logger }) {
    // getConfig validates required fields and returns ValidatedConfig
    const config = getConfig(partialConfig, logger);

    try {
      const authClient = await createAuthClient(config.settings);
      logger.debug('Auth client created');

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
