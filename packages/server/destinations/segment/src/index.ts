import type { Destination, Settings, SegmentAnalyticsMock } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationSegment from './types';

export const destinationSegment: Destination = {
  type: 'segment',

  config: {},

  init({ config: partialConfig, logger, env }) {
    const config = getConfig(partialConfig, logger);
    const settings = config.settings as Settings;

    // Use env.analytics mock if provided (testing), otherwise create real SDK
    const envAnalytics = (
      env as { analytics?: SegmentAnalyticsMock } | undefined
    )?.analytics;

    if (!envAnalytics) {
      // Production path: create real Analytics instance
      try {
        const { Analytics } = require('@segment/analytics-node');
        const {
          writeKey,
          userId: _u,
          anonymousId: _a,
          identify: _i,
          group: _g,
          consent: _c,
          integrations: _int,
          _analytics: _existing,
          _state: _existingState,
          ...sdkOptions
        } = settings;

        const analytics = new Analytics({ writeKey, ...sdkOptions });
        settings._analytics = analytics;
      } catch (err) {
        logger.throw(`Failed to initialize Segment SDK: ${err}`);
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
      await (analytics as unknown as SegmentAnalyticsMock).closeAndFlush({
        timeout: 5000,
      });
    }
  },
};

export default destinationSegment;
