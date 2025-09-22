import type { Source, WalkerOS, On } from '@walkeros/core';
import type { Scope, Settings, Environment } from './types';
import type {
  BrowserPushData,
  BrowserPushOptions,
  BrowserPushContext,
  BrowserPush,
} from './types/elb';
import { isString } from '@walkeros/core';
import { initTriggers, processLoadTriggers, ready } from './trigger';
import { destroyVisibilityTracking } from './triggerVisible';
import { initElbLayer } from './elbLayer';
import { translateToCoreCollector } from './translation';
import { sessionStart } from './session';
import { getPageViewData } from './walker';
import { getConfig } from './config';

export * as SourceBrowser from './types';

// Export walker utility functions
export {
  getAllEvents,
  getEvents,
  getGlobals,
  getElbAttributeName,
  getElbValues,
} from './walker';

// Export tagger functionality
export { createTagger } from './tagger';
export type { TaggerConfig, TaggerInstance } from './tagger';

/**
 * Browser source implementation using environment injection.
 *
 * This source captures DOM events, manages sessions, handles pageviews,
 * and processes the elbLayer for browser environments.
 */
export const sourceBrowser: Source.Init<Settings> = async (
  config: Partial<Source.Config<Settings>>,
  env?: Source.Environment,
) => {
  try {
    // Extract and validate environment dependencies
    const browserEnv = (env || {}) as Environment;
    const { elb, window: envWindow, document: envDocument } = browserEnv;

    if (!elb) {
      throw new Error('Browser source requires elb function in environment');
    }

    // Get configuration from config parameter, merged with defaults
    const userSettings = config?.settings || {};
    const settings: Settings = getConfig(userSettings, envDocument);

    // Full configuration with defaults
    const fullConfig: Source.Config<Settings> = {
      settings,
    };

    // Create translation context
    const translationContext = {
      elb,
      settings,
    };

    // Initialize features if environment is available
    // Skip all DOM-related functionality when not in browser environment
    if (envDocument && envWindow) {
      // Initialize ELB Layer for async command handling
      if (settings.elbLayer !== false) {
        initElbLayer(elb, {
          name: isString(settings.elbLayer) ? settings.elbLayer : 'elbLayer',
          prefix: settings.prefix,
          window: envWindow,
        });
      }

      // Initialize session if enabled
      if (settings.session) {
        const sessionConfig =
          typeof settings.session === 'boolean' ? {} : settings.session;
        sessionStart(elb, sessionConfig);
      }

      // Setup global triggers (click, submit) when DOM is ready
      await ready(initTriggers, translationContext, settings);

      // Setup load triggers and pageview on each run
      const handleRun = () => {
        processLoadTriggers(translationContext, settings);

        // Send pageview if enabled
        if (settings.pageview) {
          const [data, context] = getPageViewData(
            settings.prefix || 'data-elb',
            settings.scope as Scope,
          );
          translateToCoreCollector(
            translationContext,
            'page view',
            data,
            'load',
            context,
          );
        }
      };

      // Trigger initial run if this is a new session/page load
      handleRun();

      // Set up automatic window.elb assignment if configured
      if (isString(settings.elb) && settings.elb) {
        (envWindow as unknown as Record<string, unknown>)[settings.elb] = (
          ...args: unknown[]
        ) => {
          const [event, data, options, context, nested, custom] = args;
          return translateToCoreCollector(
            translationContext,
            event,
            data as BrowserPushData | undefined,
            options as BrowserPushOptions | undefined,
            context as BrowserPushContext | undefined,
            nested as WalkerOS.Entities,
            custom as WalkerOS.Properties,
          );
        };
      }
    }

    // Handle events pushed from collector (consent, session, ready, run)
    const handleEvent = async (event: On.Types, context?: unknown) => {
      switch (event) {
        case 'consent':
          // React to consent changes - sources can implement specific consent handling
          // For browser source, we might want to re-evaluate session settings
          if (settings.session && context) {
            const sessionConfig =
              typeof settings.session === 'boolean' ? {} : settings.session;
            sessionStart(elb, sessionConfig);
          }
          break;

        case 'session':
          // React to session events if needed
          // Browser source typically handles session creation, not reaction
          break;

        case 'ready':
          // React to collector ready state
          // Browser source initialization already handles this
          break;

        case 'run':
          // React to collector run events - re-process load triggers
          if (envDocument && envWindow) {
            processLoadTriggers(translationContext, settings);

            // Send pageview if enabled
            if (settings.pageview) {
              const [data, contextData] = getPageViewData(
                settings.prefix || 'data-elb',
                settings.scope as Scope,
              );
              translateToCoreCollector(
                translationContext,
                'page view',
                data,
                'load',
                contextData,
              );
            }
          }
          break;

        default:
          break;
      }
    };

    // Create browser-specific push method using translateToCoreCollector
    const push = ((...args: Parameters<BrowserPush>) => {
      const [event, data, options, context, nested, custom] = args;
      return translateToCoreCollector(
        translationContext,
        event,
        data,
        options,
        context,
        nested,
        custom,
      );
    }) as BrowserPush;

    // Return stateless source instance with event handler and push method
    const instance = {
      type: 'browser',
      config: fullConfig,
      push,
      destroy: async () => {
        // Cleanup visibility tracking and other resources
        if (envDocument) {
          destroyVisibilityTracking(settings.scope || envDocument);
        }
      },
      on: handleEvent,
    };

    return instance;
  } catch (error) {
    throw error;
  }
};

export default sourceBrowser;
