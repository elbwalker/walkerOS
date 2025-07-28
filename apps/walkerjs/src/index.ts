import type { Config, Instance } from './types';
import { createCollector, type CollectorConfig } from '@walkerOS/collector';
import { assign, isObject } from '@walkerOS/core';
import {
  sourceBrowser,
  getAllEvents,
  getEvents,
  getGlobals,
  type SourceBrowser,
} from '@walkerOS/web-source-browser';
import { sourceDataLayer } from '@walkerOS/web-source-dataLayer';
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
        dataLayer: dataLayerDestination(),
      },
    },
    browser: {
      run: true,
      session: true,
    },
    dataLayer: false,
    elb: 'elb',
  };

  const fullConfig = assign(defaultConfig, config);

  // Build collector config with sources
  const collectorConfig: Partial<CollectorConfig> = {
    ...fullConfig.collector,
    sources: {
      browser: {
        code: sourceBrowser,
        config: {
          settings: fullConfig.browser,
        },
      },
    },
  };

  // Add dataLayer source if configured
  if (fullConfig.dataLayer) {
    const dataLayerSettings = isObject(fullConfig.dataLayer)
      ? fullConfig.dataLayer
      : {};

    if (collectorConfig.sources) {
      collectorConfig.sources.dataLayer = {
        code: sourceDataLayer(dataLayerSettings),
        config: {
          settings: dataLayerSettings,
        },
      };
    }
  }

  const { collector } = await createCollector(collectorConfig);

  // Get browser elb function
  const browserSource = collector.sources.browser;
  if (!browserSource?.elb) {
    throw new Error('Failed to initialize browser source');
  }

  const instance: Instance = {
    collector,
    elb: browserSource.elb as SourceBrowser.BrowserPush,
  };

  // Set up global variables if configured
  if (fullConfig.elb) window[fullConfig.elb] = browserSource.elb;
  if (fullConfig.name) window[fullConfig.name] = collector;

  return instance;
}

// Export factory function as default
export default createWalkerjs;
