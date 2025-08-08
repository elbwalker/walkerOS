import type { Collector, WalkerOS, Source, On } from '@walkeros/core';
import type { BrowserSourceConfig, Scope, Settings } from './types';
import type {
  BrowserPushData,
  BrowserPushOptions,
  BrowserPushContext,
  BrowserPush,
} from './types/elb';
import { isString } from '@walkeros/core';
import { initTriggers, processLoadTriggers, ready, Triggers } from './trigger';
import { destroyVisibilityTracking } from './triggerVisible';
import { initElbLayer } from './elbLayer';
import { translateToCoreCollector } from './translation';
import { sessionStart } from './session';
import { getPageViewData } from './walker';
import { getConfig } from './config';

export * as SourceBrowser from './types';

// @TODO export examples

// Export walker utility functions
export { getAllEvents, getEvents, getGlobals } from './walker';

// Export tagger functionality
export { createTagger } from './tagger';
export type { TaggerConfig, TaggerInstance } from './tagger';

// Browser source init function for createSource
export const sourceBrowser: Source.Init<
  BrowserSourceConfig,
  BrowserPush
> = async (collector: Collector.Instance, config: BrowserSourceConfig) => {
  try {
    // Get full configuration with defaults
    const fullConfig: BrowserSourceConfig & { settings: Required<Settings> } = {
      ...config,
      settings: getConfig(config.settings),
    };

    // Create the source instance
    const source: Source.Instance<BrowserSourceConfig> = {
      type: 'browser',
      config: fullConfig,
      collector,
      destroy() {
        destroyVisibilityTracking(collector);
        // Additional cleanup could be added here
      },
    };

    // Initialize ELB Layer for async command handling
    if (fullConfig.settings.elbLayer !== false) {
      initElbLayer(collector, {
        name: isString(fullConfig.settings.elbLayer)
          ? fullConfig.settings.elbLayer
          : 'elbLayer',
        prefix: fullConfig.settings.prefix,
      });
    }

    // Initialize session if enabled
    if (fullConfig.settings.session) {
      const sessionConfig =
        typeof fullConfig.settings.session === 'boolean'
          ? {}
          : fullConfig.settings.session;
      sessionStart(collector, { config: sessionConfig });
    }

    // Setup one-time global triggers (click, submit) via ready state
    await ready(initTriggers, collector, fullConfig.settings);

    // Register on.run callback for load triggers AND pageview (runs on each walker run)
    const runCallback: On.RunFn = (collectorInstance) => {
      // Process load triggers and scope-based triggers on each run
      processLoadTriggers(collectorInstance, fullConfig.settings);

      // Send pageview if enabled
      if (fullConfig.settings.pageview) {
        const [data, context] = getPageViewData(
          fullConfig.settings.prefix || 'data-elb',
          fullConfig.settings.scope as Scope,
        );
        translateToCoreCollector(
          collectorInstance,
          'page view',
          data,
          Triggers.Load,
          context,
        );
      }
    };

    await collector.push('walker on', 'run', runCallback);

    // Setup cleanup for visibility tracking on collector destroy
    const originalDestroy = (
      collector as Collector.Instance & { _destroy?: () => void }
    )._destroy;
    (collector as Collector.Instance & { _destroy?: () => void })._destroy =
      () => {
        source.destroy?.();
        if (originalDestroy) originalDestroy();
      };

    // Create browser-specific elb function with flexible arguments
    const elb: BrowserPush = ((...args: unknown[]) => {
      // Use the translation layer to convert flexible browser inputs to collector format
      const [event, data, options, context, nested, custom] = args;
      return translateToCoreCollector(
        collector,
        fullConfig.settings.prefix,
        event,
        data as BrowserPushData,
        options as BrowserPushOptions,
        context as BrowserPushContext,
        nested as WalkerOS.Entities,
        custom as WalkerOS.Properties,
      );
    }) as BrowserPush;

    // Automatically assign elb function to window using settings.elb property
    if (isString(fullConfig.settings.elb))
      window[fullConfig.settings.elb] = elb;

    return { source, elb };
  } catch (error) {
    throw error; // Re-throw so tryCatchAsync can handle it
  }
};

export default sourceBrowser;
