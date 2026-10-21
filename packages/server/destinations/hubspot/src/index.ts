import type { Destination } from './types';
import { StepError } from '@walkeros/core';
import { getConfig } from './config';
import { push, pushBatch } from './push';

// Types
export * as DestinationHubspot from './types';

/**
 * Batching is the collector's `config.batch`: a flushed batch goes out
 * through the batch API in `pushBatch`, with each entry's own outcome.
 */
export const destinationHubspot: Destination = {
  type: 'hubspot',

  config: {},

  init({ config: partialConfig, env }) {
    const config = getConfig(partialConfig);
    const { settings } = config;

    // Use env.client mock if provided (testing), otherwise create real SDK
    if (!env?.client) {
      try {
        const { Client } = require('@hubspot/api-client');
        settings._client = new Client({
          accessToken: settings.accessToken,
        });
      } catch (err) {
        throw new StepError('Failed to initialize the HubSpot SDK', {
          code: 'not-ready',
          cause: err,
        });
      }
    }

    settings._state = {};

    return config;
  },

  push,

  pushBatch,
};

export default destinationHubspot;
