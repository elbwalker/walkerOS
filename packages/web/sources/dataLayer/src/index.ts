import type { Source, Elb } from '@walkeros/core';
import type { Types } from './types';
import { interceptDataLayer, processExistingEvents } from './interceptor';

// Export types for external usage
export * as SourceDataLayer from './types';

// Export examples
export * from './examples';

/**
 * DataLayer source implementation using environment injection.
 *
 * This source intercepts dataLayer.push calls and transforms them to WalkerOS events.
 * It works by replacing the dataLayer.push method with a custom handler.
 */
export const sourceDataLayer: Source.Init<Types> = async (
  config: Partial<Source.Config<Types>>,
  env: Source.Env<Types>,
) => {
  try {
    // Extract environment dependencies
    const { elb, window: envWindow } = env;

    // Default configuration, merged with provided config
    const settings: Source.Settings<Types> = {
      name: 'dataLayer',
      prefix: 'dataLayer',
      ...config?.settings,
    };

    // Full configuration with defaults
    const fullConfig: Source.Config<Types> = {
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
