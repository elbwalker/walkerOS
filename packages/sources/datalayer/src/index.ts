import type { Config, DataLayer } from './types';
import { intercept, push } from './push';

export * as SourceDataLayer from './types';

export function sourceDataLayer(
  partialConfig: Partial<Config> = {},
): Config | undefined {
  const { elb, prefix = 'dataLayer' } = partialConfig;
  if (!elb) return;

  let { dataLayer, processedEvents } = partialConfig;

  // Ensure the dataLayer exists
  if (!dataLayer) {
    const { name = 'dataLayer' } = partialConfig;
    const key = name as keyof Window;

    // Ensure the dataLayer exists
    if (!window[key]) (window[key] as unknown) = [];

    dataLayer = window[key] as DataLayer;
  }

  // Ensure the processedEvents exists
  if (!processedEvents) processedEvents = new Set();

  const config: Config = {
    ...partialConfig,
    elb,
    dataLayer,
    prefix,
    processedEvents,
  };

  // Process already existing events in the dataLayer
  dataLayer.forEach((item) => push(config, item));

  // Override the original push function to intercept incoming events
  intercept(config);

  return config;
}

export default sourceDataLayer;
