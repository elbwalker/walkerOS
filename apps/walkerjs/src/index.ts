import type { WalkerOS } from '@walkerOS/core';
import type { Config, Instance } from './types';
import { createCollector } from '@walkerOS/collector';
import { assign, createSource, isObject } from '@walkerOS/core';
import {
  sourceBrowser,
  getAllEvents,
  getEvents,
  getGlobals,
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

  const { collector } = await createCollector(fullConfig.collector);

  const { elb } = await createSource(collector, sourceBrowser, {
    type: 'browser',
    id: 'browser',
    settings: fullConfig.browser,
  });

  if (!elb) throw new Error('Failed to initialize browser source');

  if (fullConfig.dataLayer) {
    const dataLayerSettings = isObject(fullConfig.dataLayer)
      ? fullConfig.dataLayer
      : {};

    await createSource(collector, sourceDataLayer(dataLayerSettings), {
      id: 'dataLayer',
      settings: dataLayerSettings,
    });
  }

  const instance: Instance = {
    collector,
    elb,
  };

  // Set up global variables if configured
  if (fullConfig.elb) window[fullConfig.elb] = elb;
  if (fullConfig.name) window[fullConfig.name] = collector;

  return instance;
}

// Export factory function as default
export default createWalkerjs;
