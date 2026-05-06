import type { Source, WalkerOS, On } from '@walkeros/core';
import type { Scope, Types, Env } from './types';
import type {
  BrowserPushData,
  BrowserPushOptions,
  BrowserPushContext,
  BrowserPush,
} from './types/elb';
import { isString } from '@walkeros/core';
import { initTriggers, processLoadTriggers, ready } from './trigger';
import { destroyVisibilityTracking } from './triggerVisible';
import { initElbLayer, drainNonWalkerEvents } from './elbLayer';
import { translateToCoreCollector } from './translation';
import { getPageViewData } from './walker';
import { getConfig } from './config';

export * as SourceBrowser from './types';

// Export examples
export * as examples from './examples';

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
 * The factory body is side-effect-free: it constructs the Instance and
 * captures closure state. All eager setup (elbLayer drain, DOM listeners,
 * `window.elb` assignment) lives in the `init` lifecycle method, which
 * the collector calls after every source factory has registered. The
 * collector strictly gates `on()` delivery: lifecycle events are queued
 * in `instance.queueOn` until the source is started.
 */
export const sourceBrowser: Source.Init<Types> = async (context) => {
  const { config, env, logger } = context;
  const { elb, command, window, document } = env;

  const userSettings = config?.settings || {};
  const actualWindow =
    window ||
    (typeof globalThis.window !== 'undefined' ? globalThis.window : undefined);
  const actualDocument =
    document ||
    (typeof globalThis.document !== 'undefined'
      ? globalThis.document
      : undefined);

  const settings: Source.Settings<Types> = getConfig(
    userSettings,
    actualDocument as Document | undefined,
  );

  const fullConfig: Source.Config<Types> = {
    settings,
  };

  const translationContext = {
    elb,
    settings,
  };

  // Helper to send pageview event if enabled
  const sendPageview = (s: Source.Settings<Types>) => {
    if (!s.pageview) return;
    const [data, contextData] = getPageViewData(
      s.prefix || 'data-elb',
      s.scope as Scope,
    );
    translateToCoreCollector(
      translationContext,
      'page view',
      data,
      'load',
      contextData,
    );
  };

  // Lifecycle method — eager. The collector calls this AFTER all source
  // factories have registered. Side effects allowed: drains walker
  // commands from window.elbLayer, sets up DOM listeners, overrides
  // elbLayer.push for live captures.
  const init = async () => {
    if (!actualWindow || !actualDocument) return;

    if (settings.elbLayer !== false && elb) {
      initElbLayer(elb, {
        name: isString(settings.elbLayer) ? settings.elbLayer : 'elbLayer',
        prefix: settings.prefix,
        window: actualWindow as Window,
        logger,
      });
    }

    // Setup global triggers (click, submit) when DOM is ready
    await ready(initTriggers, translationContext, settings);

    // Set up automatic window.elb assignment if configured
    if (isString(settings.elb) && settings.elb) {
      (actualWindow as unknown as Record<string, unknown>)[settings.elb] = (
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
  };

  // Lifecycle handler — fired by the collector only when this source is
  // started (config.init=true AND config.require empty). Pre-start events
  // are buffered in instance.queueOn by the collector and replayed on start.
  const handleEvent = async (event: On.Types) => {
    switch (event) {
      case 'run':
        if (actualDocument && actualWindow) {
          processLoadTriggers(translationContext, settings);
          drainNonWalkerEvents(elb, settings, actualWindow as Window, logger);
          sendPageview(settings);
        }
        break;

      default:
        break;
    }
  };

  const push: BrowserPush = ((...args: Parameters<BrowserPush>) => {
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
  }) satisfies BrowserPush;

  // Return stateless source instance with event handler and push method
  return {
    type: 'browser',
    config: fullConfig,
    push,
    on: handleEvent,
    init,
    destroy: async () => {
      // Cleanup visibility tracking and other resources
      if (actualDocument) {
        destroyVisibilityTracking(
          settings.scope || (actualDocument as Document),
        );
      }
    },
  };
};

export default sourceBrowser;
