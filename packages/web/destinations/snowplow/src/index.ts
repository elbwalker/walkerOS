import type { Settings, Destination } from './types';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import { addScript, setup } from './setup';

// Types
export * as DestinationSnowplow from './types';

// Examples
export * as examples from './examples';

/**
 * Snowplow destination for walkerOS
 *
 * Sends events to Snowplow Analytics using the browser tracker.
 *
 * @example
 * Basic usage
 * ```typescript
 * import { destinationSnowplow } from '@walkeros/web-destination-snowplow';
 *
 * elb('walker destination', destinationSnowplow, {
 *   settings: {
 *     collectorUrl: 'https://collector.example.com',
 *     appId: 'my-app'
 *   }
 * });
 * ```
 *
 * @example
 * With custom tracker name
 * ```typescript
 * elb('walker destination', destinationSnowplow, {
 *   settings: {
 *     collectorUrl: 'https://collector.example.com',
 *     appId: 'my-app',
 *     trackerName: 'myTracker'
 *   }
 * });
 * ```
 */
export const destinationSnowplow: Destination = {
  type: 'snowplow',

  config: {},

  /**
   * Initialize the Snowplow tracker
   *
   * Creates a new tracker instance with the provided configuration.
   *
   * @param context - Initialization context
   * @returns Updated configuration
   */
  init({ config, env }) {
    const { settings = {} as Partial<Settings>, loadScript } = config;
    const { collectorUrl } = settings;

    // Load Snowplow script if required
    if (loadScript && collectorUrl) {
      addScript(collectorUrl, env);
    }

    // Required collector URL
    if (!collectorUrl) {
      // eslint-disable-next-line no-console
      console.warn('[Snowplow] Collector URL is required');
      return false;
    }

    // Setup snowplow function
    const snowplow = setup(env);
    if (!snowplow) return false;

    // Initialize tracker
    snowplow('newTracker', settings.trackerName || 'sp', collectorUrl, {
      appId: settings.appId || 'walkerOS',
      platform: settings.platform || 'web',
    });

    return config;
  },

  /**
   * Process and send an event to Snowplow
   *
   * Transforms the walkerOS event and sends it using either structured
   * or self-describing event format.
   *
   * @param event - The walkerOS event to process
   * @param context - Push context with config, data, mapping, and env
   */
  push(event, { config, data, env }) {
    const { window } = getEnv(env);
    const w = window as Window;
    const snowplow = w.snowplow;

    if (!snowplow) {
      // eslint-disable-next-line no-console
      console.warn('[Snowplow] Tracker not initialized');
      return;
    }

    if (!isObject(data)) {
      // eslint-disable-next-line no-console
      console.warn('[Snowplow] Invalid data format');
      return;
    }

    try {
      // Handle page view events
      if (event.name === 'page view') {
        snowplow('trackPageView');
        return;
      }

      // Handle self-describing events
      if (config.settings?.eventMethod === 'self') {
        // Data should already have the { event: { schema, data } } structure from mapping
        snowplow('trackSelfDescribingEvent', data);
        return;
      }

      // Handle structured events (default)
      const params = data as Record<string, unknown>;
      snowplow(
        'trackStructEvent',
        (params.category as string) || 'walkerOS',
        (params.action as string) || event.action || 'event',
        params.label as string | undefined,
        params.property as string | undefined,
        params.value as number | undefined,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Snowplow] Event tracking failed:', error);
    }
  },
};

export default destinationSnowplow;
