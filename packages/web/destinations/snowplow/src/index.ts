import type { WalkerOS, Logger } from '@walkeros/core';
import type { Settings, Destination, Mapping } from './types';
import { isUrlBasedPlugin, deriveEnableMethod } from './types';
import { addScript, setup } from './setup';
import { pushSnowplowEvent } from './push';

// Types
export * as DestinationSnowplow from './types';

// Examples (for testing)
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
  init({ config, env, logger }) {
    const { settings = {} as Partial<Settings>, loadScript } = config;

    const { collectorUrl } = settings;

    // Required collector URL
    if (!collectorUrl) logger.throw('Config settings collectorUrl missing');

    // Load Snowplow script if required
    if (loadScript) {
      addScript(collectorUrl!, env);
    }

    // Setup snowplow function
    const snowplow = setup(env);
    if (!snowplow) return false;

    // Initialize tracker with full configuration
    snowplow('newTracker', settings.trackerName || 'sp', collectorUrl!, {
      appId: settings.appId || 'walkerOS',
      platform: settings.platform || 'web',
      discoverRootDomain: settings.discoverRootDomain,
      cookieSameSite: settings.cookieSameSite,
      appVersion: settings.appVersion,
      contexts: settings.contexts,
    });

    // Enable activity tracking if configured
    if (settings.activityTracking) {
      snowplow('enableActivityTracking', settings.activityTracking);
    }

    // Load plugins
    if (settings.plugins) {
      for (const plugin of settings.plugins) {
        if (isUrlBasedPlugin(plugin)) {
          // URL-based plugin (sp.js approach)
          snowplow('addPlugin', plugin.url, plugin.name);
          const enableMethod =
            plugin.enableMethod ?? deriveEnableMethod(plugin.name[1]);
          if (plugin.options) {
            snowplow(enableMethod, plugin.options);
          } else {
            snowplow(enableMethod);
          }
        } else {
          // BrowserPlugin instance (npm approach)
          snowplow('addPlugin', { plugin });
        }
      }
    }

    // Register global contexts
    if (settings.globalContexts && settings.globalContexts.length > 0) {
      snowplow('addGlobalContexts', settings.globalContexts);
    }

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
  async push(event, { config, data = {}, rule = {}, env, logger }) {
    const eventMapping = rule.settings || {};
    await pushSnowplowEvent(
      event,
      eventMapping,
      data as WalkerOS.AnyObject,
      rule.name, // Action type from mapping rule (e.g., ACTIONS.ADD_TO_CART)
      config.settings,
      env,
      logger,
    );
  },
};

export default destinationSnowplow;
