import type { WalkerOS } from '@walkeros/core';
import type { Settings, Destination, Mapping } from './types';
import { addScript, setup } from './setup';
import { pushSnowplowEvent } from './push';

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
   * Transforms the walkerOS event using the mapping configuration and
   * sends it as a Snowplow ecommerce self-describing event.
   *
   * @param event - The walkerOS event to process
   * @param context - Push context with config, data, rule, and env
   */
  push(event, { config, data = {}, rule = {}, env }) {
    const eventMapping = rule.settings || {};
    pushSnowplowEvent(
      event,
      eventMapping,
      data as WalkerOS.AnyObject,
      config.settings,
      env,
    );
  },
};

export default destinationSnowplow;
