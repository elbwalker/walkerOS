import type { WalkerOS, Source } from '@walkerOS/core';
import type { Settings, DataLayerSourceConfig } from './types';
import { interceptDataLayer, processExistingEvents } from './interceptor';
import { getId } from '@walkerOS/core';

// Export types for external usage
export * as SourceDataLayer from './types';

// Export examples
export * from './examples';

/**
 * DataLayer source initialization function
 * Sets up dataLayer interception and processes existing events
 */
const initDataLayerSource: Source.Init<DataLayerSourceConfig> = (
  collector: WalkerOS.Collector,
  config: DataLayerSourceConfig,
) => {
  const sourceId = `dataLayer_${getId(8)}`;
  const { settings } = config;

  // Create the source instance
  const source: Source.Instance<DataLayerSourceConfig> = {
    id: sourceId,
    type: 'dataLayer',
    config,
    collector,
    destroy() {
      // Cleanup: restore original dataLayer.push if possible
      const dataLayerName = settings.name || 'dataLayer';
      if (window[dataLayerName] && Array.isArray(window[dataLayerName])) {
        // Note: Complete restoration would require storing original push method
        // For now, we'll just document this limitation
      }
    },
  };

  // Process existing events in dataLayer
  processExistingEvents(collector, {
    settings,
    mapping: undefined,
  });

  // Set up interception for new events
  interceptDataLayer(collector, {
    settings,
    mapping: undefined,
  });

  // Create dataLayer-specific elb function
  const elb: WalkerOS.AnyFunction = (...args: unknown[]) => {
    // DataLayer source doesn't typically expose its own elb function
    // Users push directly to dataLayer, not to the source
    // But we can provide a convenience function for direct push
    const dataLayerName = settings.name || 'dataLayer';
    const dataLayer = window[dataLayerName] as unknown[];

    if (Array.isArray(dataLayer)) {
      return Promise.resolve(dataLayer.push(...args));
    }

    return Promise.resolve(0);
  };

  return { source, elb };
};

/**
 * DataLayer source factory function
 * Intercepts dataLayer.push calls and transforms them to WalkerOS events
 */
export function sourceDataLayer(
  init: Partial<Settings> = {},
): Source.Init<DataLayerSourceConfig> & {
  init?: (
    collector: WalkerOS.Collector,
    config: { settings: Settings },
  ) => void;
  settings?: Settings;
  type?: string;
} {
  const sourceInit = (
    collector: WalkerOS.Collector,
    config: DataLayerSourceConfig,
  ) => {
    // Merge provided settings with defaults
    const fullConfig: DataLayerSourceConfig = {
      ...config,
      settings: {
        name: 'dataLayer',
        prefix: 'dataLayer',
        ...init,
        ...config.settings,
      },
    };

    return initDataLayerSource(collector, fullConfig);
  };

  // Add backward compatibility properties for tests
  sourceInit.init = (
    collector: WalkerOS.Collector,
    config: { settings: Settings },
  ) => {
    return initDataLayerSource(collector, {
      type: 'dataLayer',
      settings: config.settings,
    } as DataLayerSourceConfig);
  };

  sourceInit.settings = {
    name: 'dataLayer',
    prefix: 'dataLayer',
    ...init,
  };

  sourceInit.type = 'dataLayer';

  return sourceInit;
}

export default sourceDataLayer;
