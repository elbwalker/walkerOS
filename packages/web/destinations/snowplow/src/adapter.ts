import type {
  SnowplowAdapter,
  SnowplowFunction,
  TrackerFunctions,
  SelfDescribingEvent,
} from './types';
import type {
  ActivityTrackingConfiguration,
  BrowserPlugin,
} from '@snowplow/browser-tracker-core';

/**
 * Create adapter from sp.js command queue (window.snowplow)
 *
 * Wraps the command queue pattern to match SnowplowAdapter interface.
 */
export function createQueueAdapter(
  snowplow: SnowplowFunction,
): SnowplowAdapter {
  return {
    trackPageView(event?: Record<string, unknown>) {
      if (event) {
        snowplow('trackPageView', event);
      } else {
        snowplow('trackPageView');
      }
    },
    trackSelfDescribingEvent(event: SelfDescribingEvent) {
      snowplow('trackSelfDescribingEvent', event);
    },
    trackStructEvent(event: Record<string, unknown>) {
      snowplow('trackStructEvent', event);
    },
    setUserId(userId?: string | null) {
      snowplow('setUserId', userId);
    },
    enableActivityTracking(config: ActivityTrackingConfiguration) {
      snowplow('enableActivityTracking', config);
    },
    addPlugin(config: { plugin: BrowserPlugin } | [string, [string, string]]) {
      if (Array.isArray(config)) {
        // URL-based plugin: [url, [namespace, constructor]]
        snowplow('addPlugin', config[0], config[1]);
      } else {
        // Code-based plugin: { plugin: BrowserPlugin }
        snowplow('addPlugin', config);
      }
    },
    addGlobalContexts(contexts: unknown[]) {
      snowplow('addGlobalContexts', contexts);
    },
    clearUserData(config?: Record<string, unknown>) {
      if (config) {
        snowplow('clearUserData', config);
      } else {
        snowplow('clearUserData');
      }
    },
    enableAnonymousTracking(config?: Record<string, unknown>) {
      if (config) {
        snowplow('enableAnonymousTracking', config);
      } else {
        snowplow('enableAnonymousTracking');
      }
    },
    disableAnonymousTracking(config?: Record<string, unknown>) {
      if (config) {
        snowplow('disableAnonymousTracking', config);
      } else {
        snowplow('disableAnonymousTracking');
      }
    },
    trackConsentAllow(params: Record<string, unknown>) {
      snowplow('trackConsentAllow', params);
    },
    trackConsentDeny(params: Record<string, unknown>) {
      snowplow('trackConsentDeny', params);
    },
    trackConsentSelected(params: Record<string, unknown>) {
      snowplow('trackConsentSelected', params);
    },
    setPageType(page: { type: string; language?: string; locale?: string }) {
      snowplow('setPageType', page);
    },
    call(method: string, ...args: unknown[]) {
      snowplow(method, ...args);
    },
  };
}

/**
 * Create adapter from browser-tracker module functions
 *
 * Wraps individual imported functions to match SnowplowAdapter interface.
 * Functions are passed via settings.tracker with $code: references.
 */
export function createBrowserTrackerAdapter(
  functions: TrackerFunctions,
): SnowplowAdapter {
  return {
    trackPageView(event?: Record<string, unknown>) {
      if (functions.trackPageView) {
        functions.trackPageView(event);
      }
    },
    trackSelfDescribingEvent(event: SelfDescribingEvent) {
      functions.trackSelfDescribingEvent(event);
    },
    trackStructEvent(event: Record<string, unknown>) {
      if (functions.trackStructEvent) {
        functions.trackStructEvent(event);
      }
    },
    setUserId(userId?: string | null) {
      if (functions.setUserId) {
        functions.setUserId(userId);
      }
    },
    enableActivityTracking(config: ActivityTrackingConfiguration) {
      if (functions.enableActivityTracking) {
        functions.enableActivityTracking(config);
      }
    },
    addPlugin(config: { plugin: BrowserPlugin } | [string, [string, string]]) {
      if (functions.addPlugin && !Array.isArray(config)) {
        functions.addPlugin(config);
      }
      // URL-based plugins not supported in browser-tracker mode
    },
    addGlobalContexts(contexts: unknown[]) {
      if (functions.addGlobalContexts) {
        functions.addGlobalContexts(contexts);
      }
    },
    clearUserData(config?: Record<string, unknown>) {
      if (functions.clearUserData) {
        functions.clearUserData(config);
      }
    },
    enableAnonymousTracking(config?: Record<string, unknown>) {
      if (functions.enableAnonymousTracking) {
        functions.enableAnonymousTracking(config);
      }
    },
    disableAnonymousTracking(config?: Record<string, unknown>) {
      if (functions.disableAnonymousTracking) {
        functions.disableAnonymousTracking(config);
      }
    },
    trackConsentAllow(params: Record<string, unknown>) {
      if (functions.trackConsentAllow) {
        functions.trackConsentAllow(params);
      }
    },
    trackConsentDeny(params: Record<string, unknown>) {
      if (functions.trackConsentDeny) {
        functions.trackConsentDeny(params);
      }
    },
    trackConsentSelected(params: Record<string, unknown>) {
      if (functions.trackConsentSelected) {
        functions.trackConsentSelected(params);
      }
    },
    setPageType(page: { type: string; language?: string; locale?: string }) {
      if (functions.setPageType) {
        functions.setPageType(page);
      }
    },
    call(method: string, ...args: unknown[]) {
      // In browser-tracker mode, arbitrary method calls are not supported
      // URL-based plugins that need enable methods won't work here
    },
  };
}
