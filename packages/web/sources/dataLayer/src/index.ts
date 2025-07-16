import type { WalkerOS } from '@walkerOS/core';
import type { Source, Settings } from './types';
import { interceptDataLayer, processExistingEvents } from './interceptor';

// Export types for external usage
export * as SourceDataLayer from './types';

// Export examples
export * from './examples';

/**
 * DataLayer source factory function
 * Intercepts dataLayer.push calls and transforms them to WalkerOS events
 */
export function sourceDataLayer(init: Partial<Settings> = {}): Source {
  return {
    type: 'dataLayer',
    init: initSourceDataLayer,
    settings: {
      name: 'dataLayer',
      prefix: 'dataLayer',
      ...init,
    },
  } as Source;
}

/**
 * Source initialization function
 * Sets up dataLayer interception and processes existing events
 */
const initSourceDataLayer = (
  collector: WalkerOS.Collector,
  config: WalkerOS.CollectorSourceConfig,
): void => {
  // Process existing events in dataLayer
  processExistingEvents(collector, config);

  // Set up interception for new events
  interceptDataLayer(collector, config);
};

export default sourceDataLayer;
