import type { WalkerOS } from '@walkeros/core';
import type {
  Settings,
  Destination,
  Mapping,
  Env,
  RuntimeState,
  SnowplowAdapter,
} from './types';
import type { BrowserPlugin } from '@snowplow/browser-tracker-core';
import {
  isUrlBasedPlugin,
  isCodeBasedPlugin,
  deriveEnableMethod,
} from './types';
import { DEFAULT_SCRIPT_URL, setup } from './setup';
import { pushSnowplowEvent } from './push';
import { createQueueAdapter, createBrowserTrackerAdapter } from './adapter';
import {
  getGrantedConsent,
  isObject,
  StepError,
  stepCall,
} from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';

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
 * The sp.js script `loadVendor` injects with `loadScript`. The snowplow
 * function replays its own queue, so it is called synchronously and only a
 * failed script is reported.
 */
function vendor(
  config: { loadScript?: boolean; timeout?: number; settings?: Settings },
  env?: Env,
) {
  return loadVendor(
    config.loadScript && !config.settings?.tracker
      ? config.settings?.scriptUrl || DEFAULT_SCRIPT_URL
      : undefined,
    () => getEnv<Env>(env).window.snowplow,
    { timeout: config.timeout, document: getEnv<Env>(env).document },
  );
}

/**
 * The senders a URL plugin's enable method starts, each with the call that
 * stops it (tracker and plugins 4.8.1). An empty entry is a sender without
 * an off switch: a revocation cannot stop it.
 */
const OFF_SWITCHES = new Map<string, string | undefined>([
  ['enableLinkClickTracking', 'disableLinkClickTracking'],
  ['enableFormTracking', 'disableFormTracking'],
  ['enableButtonClickTracking', 'disableButtonClickTracking'],
  ['enableYouTubeTracking', 'disableYouTubeTracking'],
  ['enableErrorTracking', undefined],
  ['enableFocalMeterIntegration', undefined],
]);

/**
 * Follows the destination's required consent with the senders that run
 * outside walkerOS's pushes. A revocation calls disableActivityTracking
 * (when activityTracking is set) and the off switch of every sp.js URL
 * plugin listed in OFF_SWITCHES; the next grant enables them again with
 * their options. A listed plugin without an off switch (error tracking,
 * FocalMeter) fails the revocation with `consent-not-applied`. Other
 * plugins are left as they are. The required consent decides on the whole
 * consent state, as it gates the pushes, and only a change that names a
 * required key counts.
 */
async function followConsent(
  settings: Partial<Settings>,
  required: WalkerOS.Consent | undefined,
  change: WalkerOS.AnyObject,
  consent: WalkerOS.Consent,
): Promise<void> {
  const state = settings._state;
  const adapter = state?.adapter;
  if (!state || !adapter || !required) return;
  if (!Object.keys(required).some((key) => key in change)) return;

  const granted = getGrantedConsent(required, consent) !== false;
  if (granted !== Boolean(state.paused)) return;

  const senders = (settings.plugins ?? [])
    .filter(isUrlBasedPlugin)
    .flatMap((plugin) => {
      const enable = plugin.enableMethod ?? deriveEnableMethod(plugin.name[1]);
      return OFF_SWITCHES.has(enable)
        ? [{ plugin, enable, disable: OFF_SWITCHES.get(enable) }]
        : [];
    });
  const { activityTracking } = settings;

  await stepCall(
    () => {
      if (activityTracking) {
        if (granted) adapter.enableActivityTracking(activityTracking);
        else adapter.disableActivityTracking();
      }
      for (const { plugin, enable, disable } of senders) {
        if (!disable) continue;
        if (!granted) adapter.call(disable);
        else if (plugin.options) adapter.call(enable, plugin.options);
        else adapter.call(enable);
      }
    },
    'consent-not-applied',
    'Snowplow did not take the consent update',
  );
  state.paused = !granted;

  const unstoppable = senders.filter(({ disable }) => !disable);
  if (!granted && unstoppable.length)
    throw new StepError(
      `Snowplow ${unstoppable.map(({ plugin }) => plugin.name[1]).join(', ')} has no off switch, so it keeps sending after a revocation`,
      { code: 'consent-not-applied' },
    );
}

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
   * Supports two modes:
   * - `tracker`: Browser-tracker mode with imported functions (npm packages)
   * - Script-based: Load sp.js script and use command queue (JavaScript tag)
   *
   * @param context - Initialization context
   * @returns Updated configuration
   */
  async init({ config, env }) {
    const { settings = {}, loadScript } = config;
    const { collectorUrl, tracker: trackerFunctions } = settings;

    // Required collector URL
    if (!collectorUrl)
      throw new StepError('Snowplow needs settings.collectorUrl', {
        code: 'config',
      });

    let adapter: SnowplowAdapter | undefined;

    if (trackerFunctions) {
      // Browser-tracker mode: use imported functions directly
      if (!trackerFunctions.newTracker)
        throw new StepError(
          'tracker.newTracker is required for browser-tracker mode',
          { code: 'config' },
        );
      if (!trackerFunctions.trackSelfDescribingEvent)
        throw new StepError(
          'tracker.trackSelfDescribingEvent is required for browser-tracker mode',
          { code: 'config' },
        );
      // URL plugins load through sp.js, which this mode does not use.
      const urlPlugins = (settings.plugins ?? []).filter(isUrlBasedPlugin);
      if (urlPlugins.length)
        throw new StepError(
          `Snowplow loads the URL plugins in settings.plugins (${urlPlugins.map((plugin) => plugin.name[1]).join(', ')}) only with sp.js, not with settings.tracker: load them on your own tracker, or drop settings.tracker so walkerOS loads them`,
          { code: 'config' },
        );

      // Initialize tracker
      await stepCall(
        () =>
          trackerFunctions.newTracker(
            settings.trackerName || 'sp',
            collectorUrl,
            {
              appId: settings.appId || 'walkerOS',
              platform: settings.platform || 'web',
              discoverRootDomain: settings.discoverRootDomain,
              cookieSameSite: settings.cookieSameSite,
              appVersion: settings.appVersion,
              contexts: settings.contexts,
              anonymousTracking: settings.anonymousTracking,
            },
          ),
        'vendor-not-ready',
        'Snowplow newTracker failed',
      );

      // Create adapter from functions
      adapter = createBrowserTrackerAdapter(trackerFunctions);
    } else {
      // URL-based mode: load sp.js script
      const snowplow = setup(env);
      if (!snowplow)
        throw new StepError('Snowplow not ready: window is missing', {
          code: 'vendor-not-ready',
        });

      // The script, once per page; a failed one is reported by each push
      vendor({ ...config, settings }, env);

      // Initialize tracker via queue
      await stepCall(
        () =>
          snowplow('newTracker', settings.trackerName || 'sp', collectorUrl, {
            appId: settings.appId || 'walkerOS',
            platform: settings.platform || 'web',
            discoverRootDomain: settings.discoverRootDomain,
            cookieSameSite: settings.cookieSameSite,
            appVersion: settings.appVersion,
            contexts: settings.contexts,
            anonymousTracking: settings.anonymousTracking,
          }),
        'vendor-not-ready',
        'Snowplow newTracker failed',
      );

      adapter = createQueueAdapter(snowplow);
    }

    const tracker = adapter;
    if (!tracker)
      throw new StepError('Snowplow adapter could not be created', {
        code: 'vendor-not-ready',
      });

    // Enable activity tracking if configured
    if (settings.activityTracking) {
      const activityTracking = settings.activityTracking;
      await stepCall(
        () => tracker.enableActivityTracking(activityTracking),
        'vendor-not-ready',
        'Snowplow enableActivityTracking failed',
      );
    }

    await stepCall(
      () => {
        // Load plugins
        if (settings.plugins) {
          for (const plugin of settings.plugins) {
            if (isCodeBasedPlugin(plugin)) {
              // Code-based plugin: use directly or call factory with config
              const pluginInstance =
                typeof plugin.code === 'function' && plugin.config
                  ? (plugin.code as (...args: unknown[]) => BrowserPlugin)(
                      plugin.config,
                    )
                  : plugin.code;
              tracker.addPlugin({ plugin: pluginInstance as BrowserPlugin });
            } else if (isUrlBasedPlugin(plugin)) {
              // URL-based plugin (sp.js approach only)
              tracker.addPlugin([plugin.url, plugin.name]);
              const enableMethod =
                plugin.enableMethod ?? deriveEnableMethod(plugin.name[1]);
              if (plugin.options) {
                tracker.call(enableMethod, plugin.options);
              } else {
                tracker.call(enableMethod);
              }
            } else {
              // BrowserPlugin instance
              tracker.addPlugin({ plugin: plugin as BrowserPlugin });
            }
          }
        }

        // Register global contexts
        if (settings.globalContexts && settings.globalContexts.length > 0) {
          tracker.addGlobalContexts(settings.globalContexts);
        }

        // Track page view on init if configured
        if (settings.trackPageView) {
          tracker.trackPageView();
        }
      },
      'vendor-not-ready',
      'Snowplow setup call failed',
    );

    // Store adapter in runtime state
    const updatedSettings = {
      ...settings,
      _state: { adapter: tracker } as RuntimeState,
    };

    return { ...config, settings: updatedSettings };
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
  async push(event, { config, env, data = {}, rule = {}, logger, collector }) {
    vendor(config, env as Env | undefined).check();

    const eventMapping = rule.settings || {};
    await stepCall(
      () =>
        pushSnowplowEvent(
          event,
          eventMapping,
          data as WalkerOS.AnyObject,
          collector,
          rule.name,
          config,
          logger,
          rule.silent === true,
        ),
      'transport',
      'Snowplow call failed',
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
  async on(type, context) {
    // Only handle consent events
    if (type !== 'consent' || !isObject(context.data)) return;

    const consent = context.data;
    // `on` runs with the runtime (non-generic) context, so config.settings and
    // env surface as the loose base types. Narrowing them to the destination's
    // own Settings/Env needs a core-types change to make `on` generic over
    // Types; tracked as a follow-up. These two `as` casts are that boundary.
    const settings = (context.config?.settings || {}) as Partial<Settings>;

    // Activity pings and the plugin senders with an off switch follow the
    // destination's required consent
    await followConsent(
      settings,
      context.config.consent,
      consent,
      context.collector.consent,
    );

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
    // For deny events, use required scopes (being denied); for allow/selected, use granted scopes
    const baseParams: Record<string, unknown> = {
      basisForProcessing: consentConfig.basisForProcessing || 'consent',
    };

    // Add optional parameters if configured
    if (consentConfig.consentUrl)
      baseParams.consentUrl = consentConfig.consentUrl;
    if (consentConfig.consentVersion)
      baseParams.consentVersion = consentConfig.consentVersion;
    if (consentConfig.domainsApplied)
      baseParams.domainsApplied = consentConfig.domainsApplied;
    if (consentConfig.gdprApplies !== undefined)
      baseParams.gdprApplies = consentConfig.gdprApplies;

    // Call the appropriate Enhanced Consent plugin method
    await stepCall(
      () => {
        if (allDenied) {
          // For deny, use required scopes (the ones being denied)
          snowplow('trackConsentDeny', {
            ...baseParams,
            consentScopes: required,
          });
        } else if (allGranted) {
          snowplow('trackConsentAllow', {
            ...baseParams,
            consentScopes: grantedScopes,
          });
        } else {
          snowplow('trackConsentSelected', {
            ...baseParams,
            consentScopes: grantedScopes,
          });
        }
      },
      'consent-not-applied',
      'Snowplow did not take the consent update',
    );
  },
};

export default destinationSnowplow;
