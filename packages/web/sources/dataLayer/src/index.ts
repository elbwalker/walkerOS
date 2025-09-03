import type { Source, Elb } from '@walkeros/core';
import type { Settings, DataLayerSourceConfig } from './types';
import { interceptDataLayer, processExistingEvents } from './interceptor';

// Export types for external usage
export * as SourceDataLayer from './types';

// Export examples
export * from './examples';

/**
 * DataLayer-specific environment interface
 */
interface DataLayerEnvironment extends Source.Environment {
  window?: typeof window;
}

/**
 * DataLayer source implementation using environment injection.
 *
 * This source intercepts dataLayer.push calls and transforms them to WalkerOS events.
 * It works by replacing the dataLayer.push method with a custom handler.
 */
export const sourceDataLayer: Source.Init<DataLayerSourceConfig> = async (
  config: Partial<DataLayerSourceConfig>,
  env?: Source.Environment,
) => {
  try {
    // Extract and validate environment dependencies
    const dataLayerEnv = (env || {}) as DataLayerEnvironment;
    const { elb, window: envWindow } = dataLayerEnv;

    if (!elb) {
      throw new Error('DataLayer source requires elb function in environment');
    }

    // Default configuration, merged with provided config
    const settings: Settings = {
      name: 'dataLayer',
      prefix: 'dataLayer',
      ...config?.settings,
    };

    // Full configuration with defaults
    const fullConfig: DataLayerSourceConfig = {
      settings,
    };

    // Initialize dataLayer interception if window is available
    if (envWindow) {
      // Process existing events in dataLayer
      processExistingEvents(elb, fullConfig);

      // Set up interception for new events
      interceptDataLayer(elb, fullConfig);
    }

    // DataLayer sources typically intercept existing dataLayer.push calls
    // The push method here forwards to the core collector elb function
    const push: Elb.Fn = elb;

    // Return stateless source instance
    return {
      type: 'dataLayer',
      config: fullConfig,
      push,
      destroy: async () => {
        // Cleanup: restore original dataLayer.push if possible
        const dataLayerName = settings.name || 'dataLayer';
        if (
          envWindow &&
          envWindow[dataLayerName] &&
          Array.isArray(envWindow[dataLayerName])
        ) {
          // Note: Complete restoration would require storing original push method
          // For now, we'll just document this limitation
        }
      },
    };
  } catch (error) {
    throw error;
  }
};

export default sourceDataLayer;
