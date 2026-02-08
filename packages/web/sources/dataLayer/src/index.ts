import type { Source, On } from '@walkeros/core';
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
export const sourceDataLayer: Source.Init<Types> = async (context) => {
  const { config, env } = context;
  const { elb, window: envWindow } = env;

  const settings: Source.Settings<Types> = {
    name: 'dataLayer',
    prefix: 'dataLayer',
    ...config?.settings,
  };

  const fullConfig: Source.Config<Types> = {
    settings,
  };

  let pendingReplayCount = 0;

  if (envWindow) {
    // Snapshot how many items exist before interception
    const dataLayerName = settings.name || 'dataLayer';
    const dl = (envWindow as Record<string, unknown>)[dataLayerName];
    pendingReplayCount = Array.isArray(dl) ? dl.length : 0;

    // Set up interceptor immediately so no new events are missed
    interceptDataLayer(elb, fullConfig);

    if (context.collector.allowed && pendingReplayCount > 0) {
      // Collector already ran — process existing events immediately
      processExistingEvents(elb, fullConfig, pendingReplayCount);
      pendingReplayCount = 0;
    }
  }

  // Handle on-run to replay existing events (when source inits before run)
  const handleEvent = async (event: On.Types) => {
    if (event === 'run' && envWindow && pendingReplayCount > 0) {
      processExistingEvents(elb, fullConfig, pendingReplayCount);
      pendingReplayCount = 0;
    }
  };

  return {
    type: 'dataLayer',
    config: fullConfig,
    push: elb,
    on: handleEvent,
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
};

export default sourceDataLayer;
