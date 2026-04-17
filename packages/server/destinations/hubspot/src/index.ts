import type { Destination, Settings, HubSpotClientMock } from './types';
import { getConfig } from './config';
import { push, flushBatch } from './push';

// Types
export * as DestinationHubspot from './types';

export const destinationHubspot: Destination = {
  type: 'hubspot',

  config: {},

  init({ config: partialConfig, logger, env }) {
    const config = getConfig(partialConfig, logger);
    const settings = config.settings as Settings;

    // Use env.client mock if provided (testing), otherwise create real SDK
    const envClient = (env as { client?: HubSpotClientMock } | undefined)
      ?.client;

    if (!envClient) {
      // Production path: create real HubSpot Client instance
      try {
        const { Client } = require('@hubspot/api-client');
        settings._client = new Client({
          accessToken: settings.accessToken,
        });
      } catch (err) {
        logger.throw(`Failed to initialize HubSpot SDK: ${err}`);
      }
    }

    settings._state = {};
    if (settings.batch) settings._eventQueue = [];

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  async destroy({ config }) {
    const settings = (config?.settings || {}) as Settings;

    // Flush remaining queued events in batch mode
    if (
      settings.batch &&
      settings._eventQueue &&
      settings._eventQueue.length > 0
    ) {
      const sdk = settings._client;
      if (sdk) {
        await flushBatch(sdk, settings);
      }
    }
  },
};

export default destinationHubspot;
