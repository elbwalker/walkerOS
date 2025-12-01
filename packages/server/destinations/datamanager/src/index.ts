import type { DestinationInterface } from './types';
import { getConfig } from './config';
import { push } from './push';
import { createAuthClient } from './auth';

export * as DestinationDataManager from './types';

export const destinationDataManager: DestinationInterface = {
  type: 'datamanager',

  config: {},

  async init({ config: partialConfig, env, logger }) {
    logger.debug('Data Manager init started');
    logger.info('Data Manager initializing...');

    // getConfig validates required fields and returns ValidatedConfig
    const config = getConfig(partialConfig, logger);

    logger.debug('Settings validated', {
      validateOnly: config.settings.validateOnly,
      destinationCount: config.settings.destinations.length,
      eventSource: config.settings.eventSource,
    });

    try {
      logger.debug('Creating auth client...');
      const authClient = await createAuthClient(config.settings);
      logger.debug('Auth client created successfully');

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
