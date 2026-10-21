import type { Destination } from './types';
import { StepError } from '@walkeros/core';
import { getConfig } from './config';
import { push, pushBatch } from './push';

// Types
export * as DestinationSegment from './types';

export const destinationSegment: Destination = {
  type: 'segment',

  // Batched by default, at the SDK's own former defaults (15 events, 10 s).
  config: { batch: { size: 15, wait: 10_000 } },

  init({ config: partialConfig, env }) {
    const config = getConfig(partialConfig);
    const { settings } = config;

    // Use env.analytics mock if provided (testing), otherwise create real SDK
    if (!env?.analytics) {
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

        // Each push and each batch flushes the SDK and waits until Segment
        // delivered its calls.
        settings._analytics = new Analytics({ writeKey, ...sdkOptions });
      } catch (err) {
        throw new StepError('Failed to initialize the Segment SDK', {
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

  async destroy({ config }) {
    const analytics = config?.settings?._analytics;
    if (analytics) await analytics.closeAndFlush({ timeout: 5000 });
  },
};

export default destinationSegment;
