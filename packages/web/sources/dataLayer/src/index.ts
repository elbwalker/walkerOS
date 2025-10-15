import type { Source } from '@walkeros/core';
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
    const { elb, window: envWindow } = env;

    const settings: Source.Settings<Types> = {
      name: 'dataLayer',
      prefix: 'dataLayer',
      ...config?.settings,
    };

    const fullConfig: Source.Config<Types> = {
      settings,
    };

    if (envWindow) {
      processExistingEvents(elb, fullConfig);
      interceptDataLayer(elb, fullConfig);
    }

    return {
      type: 'dataLayer',
      config: fullConfig,
      push: elb,
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
