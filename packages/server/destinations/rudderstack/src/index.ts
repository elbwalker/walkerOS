import type { Destination } from './types';
import { StepError } from '@walkeros/core';
import { getConfig } from './config';
import { push, pushBatch } from './push';

// Types
export * as DestinationRudderStack from './types';

export const destinationRudderStack: Destination = {
  type: 'rudderstack',

  // Batched by default, at the SDK's own former defaults (20 events, 10 s).
  config: { batch: { size: 20, wait: 10_000 } },

  init({ config: partialConfig, env }) {
    const config = getConfig(partialConfig);
    const { settings } = config;

    // Use env.analytics mock if provided (testing), otherwise create real SDK
    if (!env?.analytics) {
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

        // RudderStack uses positional constructor: new Analytics(writeKey, opts).
        // Each push and each batch flushes the SDK and waits until its calls
        // are sent. A failed send reaches each call's callback; the error
        // handler only keeps the SDK from rethrowing it as an unhandled
        // rejection.
        settings._analytics = new Analytics(writeKey, {
          dataPlaneUrl,
          ...sdkOptions,
          errorHandler: () => undefined,
        });
      } catch (err) {
        throw new StepError('Failed to initialize the RudderStack SDK', {
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
    if (analytics) await analytics.flush();
  },
};

export default destinationRudderStack;
