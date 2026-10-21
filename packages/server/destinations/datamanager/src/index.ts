import type { DestinationInterface } from './types';
import { StepError } from '@walkeros/core';
import { getConfig } from './config';
import { push } from './push';
import { createAuthClient } from './auth';

export * as DestinationDataManager from './types';

export const destinationDataManager: DestinationInterface = {
  type: 'datamanager',

  config: {},

  async init({ config: partialConfig, env, logger }) {
    // getConfig validates required fields and returns ValidatedConfig
    const config = getConfig(partialConfig);

    // Keep an injected client (tests, simulate); create one only when none is given.
    if (env?.authClient) return { ...config, env };

    try {
      const authClient = await createAuthClient(config, logger);
      logger.debug('Auth client created');

      return { ...config, env: { ...env, authClient } };
    } catch (error) {
      throw new StepError('Data Manager authentication failed', {
        code: 'config',
        cause: error,
      });
    }
  },

  async push(event, context) {
    return await push(event, context);
  },
};

export default destinationDataManager;
