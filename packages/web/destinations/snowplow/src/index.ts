import type { WalkerOS, Logger } from '@walkeros/core';
import type { Settings, Destination, Mapping, Env } from './types';
import { isUrlBasedPlugin, deriveEnableMethod } from './types';
import { addScript, setup } from './setup';
import { pushSnowplowEvent } from './push';

// Types
export * as DestinationSnowplow from './types';

// Schema constants for user convenience
export {
  SCHEMAS,
  ACTIONS,
  WEB_SCHEMAS,
  CONSENT_SCHEMAS,
  MEDIA_SCHEMAS,
  MEDIA_ACTIONS,
} from './types';

/**
 * Get the Snowplow function from the environment
 *
 * @param env - Optional environment override
 * @returns The Snowplow function or undefined if not available
 */
function getSnowplow(env?: Env) {
  return (
    env?.window?.snowplow ??
    (typeof window !== 'undefined' ? window.snowplow : undefined)
  );
}

/**
 * Clear all user data (cookies and local storage)
 *
 * Call this when a user withdraws consent or logs out to remove
 * all Snowplow identifiers (domain_userid, session cookies, etc.).
 *
 * @param env - Optional environment override for testing
 *
 * @example
 * ```typescript
 * import { clearUserData } from '@walkeros/web-destination-snowplow';
 *
 * // When user withdraws consent
 * clearUserData();
 * ```
 */
export function clearUserData(env?: Env): void {
  const snowplow = getSnowplow(env);
  if (snowplow) {
    snowplow('clearUserData');
  }
}

/**
 * Enable anonymous tracking mode
 *
 * Call this to start anonymous tracking after initialization.
 * Useful when consent state changes during the session.
 *
 * @param options - Optional configuration for anonymous tracking
 * @param env - Optional environment override for testing
 *
 * @example
 * ```typescript
 * import { enableAnonymousTracking } from '@walkeros/web-destination-snowplow';
 *
 * // Enable with server anonymisation
 * enableAnonymousTracking({ withServerAnonymisation: true });
 * ```
 */
export function enableAnonymousTracking(
  options?: {
    withServerAnonymisation?: boolean;
    withSessionTracking?: boolean;
  },
  env?: Env,
): void {
  const snowplow = getSnowplow(env);
  if (snowplow) {
    if (options) {
      snowplow('enableAnonymousTracking', options);
    } else {
      snowplow('enableAnonymousTracking');
    }
  }
}

/**
 * Disable anonymous tracking mode
 *
 * Call this to resume normal tracking after anonymous mode.
 * Useful when a user grants consent during the session.
 *
 * @param stateStorageStrategy - Optional storage strategy for state
 * @param env - Optional environment override for testing
 *
 * @example
 * ```typescript
 * import { disableAnonymousTracking } from '@walkeros/web-destination-snowplow';
 *
 * // Resume normal tracking
 * disableAnonymousTracking();
 * ```
 */
export function disableAnonymousTracking(
  stateStorageStrategy?:
    | 'cookieAndLocalStorage'
    | 'cookie'
    | 'localStorage'
    | 'none',
  env?: Env,
): void {
  const snowplow = getSnowplow(env);
  if (snowplow) {
    if (stateStorageStrategy) {
      snowplow('disableAnonymousTracking', { stateStorageStrategy });
    } else {
      snowplow('disableAnonymousTracking');
    }
  }
}

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
      addScript(collectorUrl!, env, settings.scriptUrl);
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
      anonymousTracking: settings.anonymousTracking,
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

    // Track page view on init if configured
    if (settings.trackPageView) {
      snowplow('trackPageView');
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

  /**
   * Handle lifecycle events (consent, session, ready, run)
   *
   * Primarily used for consent tracking via the Enhanced Consent plugin.
   * Reacts to walkerOS consent events and calls Snowplow's trackConsentAllow,
   * trackConsentDeny, or trackConsentSelected methods.
   *
   * @param type - The event type ('consent', 'session', 'ready', 'run')
   * @param context - The destination context with config, data, env, logger
   */
  on(type, context) {
    // Only handle consent events
    if (type !== 'consent' || !context.data) return;

    const consent = context.data as WalkerOS.Consent;
    const settings = (context.config?.settings || {}) as Partial<Settings>;
    const consentConfig = settings.consent;

    // Skip if consent tracking is not configured
    if (!consentConfig) return;

    const snowplow = getSnowplow(context.env as Env);
    if (!snowplow) return;

    // Determine which consent scopes to check
    const required = consentConfig.required || Object.keys(consent);

    // Calculate consent state based on configured required scopes
    const allGranted = required.every((scope) => consent[scope] === true);
    const allDenied = required.every((scope) => !consent[scope]);
    const grantedScopes = required.filter((scope) => consent[scope] === true);

    // Build Enhanced Consent plugin parameters
    const params: Record<string, unknown> = {
      basisForProcessing: consentConfig.basisForProcessing || 'consent',
      consentScopes: grantedScopes,
    };

    // Add optional parameters if configured
    if (consentConfig.consentUrl) params.consentUrl = consentConfig.consentUrl;
    if (consentConfig.consentVersion)
      params.consentVersion = consentConfig.consentVersion;
    if (consentConfig.domainsApplied)
      params.domainsApplied = consentConfig.domainsApplied;
    if (consentConfig.gdprApplies !== undefined)
      params.gdprApplies = consentConfig.gdprApplies;

    // Call the appropriate Enhanced Consent plugin method
    if (allDenied) {
      snowplow('trackConsentDeny', params);
    } else if (allGranted) {
      snowplow('trackConsentAllow', params);
    } else {
      snowplow('trackConsentSelected', params);
    }
  },
};

export default destinationSnowplow;
