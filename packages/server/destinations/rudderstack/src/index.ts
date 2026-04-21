import type { Destination, Settings, RudderStackAnalyticsMock } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationRudderStack from './types';

export const destinationRudderStack: Destination = {
  type: 'rudderstack',

  config: {},

  init({ config: partialConfig, logger, env }) {
    const config = getConfig(partialConfig, logger);
    const settings = config.settings as Settings;

    // Use env.analytics mock if provided (testing), otherwise create real SDK
    const envAnalytics = (
      env as { analytics?: RudderStackAnalyticsMock } | undefined
    )?.analytics;

    if (!envAnalytics) {
      // Production path: create real Analytics instance
      try {
        const Analytics = require('@rudderstack/rudder-sdk-node');
        const {
          writeKey,
          dataPlaneUrl,
          userId: _u,
          anonymousId: _a,
          identify: _i,
          group: _g,
          integrations: _int,
          _analytics: _existing,
          _state: _existingState,
          ...sdkOptions
        } = settings;

        // RudderStack uses positional constructor: new Analytics(writeKey, opts)
        const analytics = new Analytics(writeKey, {
          dataPlaneUrl,
          ...sdkOptions,
        });
        settings._analytics = analytics;
      } catch (err) {
        logger.throw(`Failed to initialize RudderStack SDK: ${err}`);
      }
    }

    settings._state = {};

    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  async destroy({ config }) {
    const settings = (config?.settings || {}) as Settings;
    const analytics = settings._analytics;
    if (analytics) {
      await (analytics as unknown as RudderStackAnalyticsMock).flush();
    }
  },
};

export default destinationRudderStack;
