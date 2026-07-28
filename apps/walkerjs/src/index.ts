import type { Config, Instance } from './types';
import type { Collector, Elb, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { assign, isObject } from '@walkeros/core';
import {
  sourceBrowser,
  getAllEvents,
  getEvents,
  getGlobals,
  SourceBrowser,
} from '@walkeros/web-source-browser';
import { sourceSession } from '@walkeros/web-source-session';
import { sourceDataLayer } from '@walkeros/web-source-datalayer';
import { dataLayerDestination } from './destination';

// Re-export types
export * as Walkerjs from './types';

export { getAllEvents, getEvents, getGlobals };

// Factory function to create walker.js instance
export async function createWalkerjs(config: Config = {}): Promise<Instance> {
  // Default configuration
  const defaultConfig: Config = {
    collector: {
      destinations: {
        dataLayer: { code: dataLayerDestination() },
      },
    },
    browser: {},
    session: true,
    dataLayer: false,
    elb: 'elb',
  };

  const fullConfig = assign(defaultConfig, config);

  // Build collector config with sources.
  //
  // `run` is deliberately absent from defaultConfig: the collector already
  // defaults it to true, and leaving it unset here is what makes "the caller
  // asked for a run mode" distinguishable from "nobody said anything". The
  // top-level flag is the documented walker.js surface (it is what an inline
  // `data-elbconfig="run:false"` parses into), so it wins over the `collector`
  // passthrough; with it omitted, `collector.run` and then the collector's own
  // default apply.
  const collectorConfig: Collector.InitConfig = {
    ...fullConfig.collector,
    ...(fullConfig.run !== undefined ? { run: fullConfig.run } : {}),
    sources: {
      browser: {
        code: sourceBrowser,
        config: {
          settings: fullConfig.browser,
        },
        env: {
          window: typeof window !== 'undefined' ? window : undefined,
          document: typeof document !== 'undefined' ? document : undefined,
        },
      },
    },
  };

  // Add session source if configured
  if (fullConfig.session !== false) {
    const sessionSettings = isObject(fullConfig.session)
      ? fullConfig.session
      : {};

    if (collectorConfig.sources) {
      collectorConfig.sources.session = {
        code: sourceSession,
        config: {
          settings: sessionSettings,
        },
      };
    }
  }

  // Add dataLayer source if configured
  if (fullConfig.dataLayer) {
    const dataLayerSettings = isObject(fullConfig.dataLayer)
      ? fullConfig.dataLayer
      : {};

    if (collectorConfig.sources) {
      collectorConfig.sources.dataLayer = {
        code: sourceDataLayer,
        config: {
          settings: dataLayerSettings,
        },
      };
    }
  }

  const flow = await startFlow<SourceBrowser.BrowserPush>(collectorConfig);

  // Set up global variables if configured (only in browser environments)
  if (typeof window !== 'undefined') {
    if (fullConfig.elb) window[fullConfig.elb] = flow.elb;
    if (fullConfig.name) window[fullConfig.name] = flow.collector;
  }

  return flow;
}

// Export factory function as default
export default createWalkerjs;
