import type { Custom, Destination } from './types';
import { isObject } from '@elbwalker/utils';

const defaultDataLayer = 'dataLayer';
const defaultDomain = 'https://www.googletagmanager.com/gtm.js?id=';

// Types
export * as DestinationGTM from './types';

export const destinationGTM: Destination = {
  type: 'google-gtm',

  config: {},

  init(config = {}) {
    const w = window as unknown as Record<string, unknown[]>;
    const { custom = {} as Partial<Custom>, fn, loadScript } = config;
    const { containerId, dataLayer, domain } = custom;
    const dataLayerName = dataLayer || defaultDataLayer;

    w[dataLayerName] = w[dataLayerName] || [];

    const func = fn || w[dataLayerName].push;
    func({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });

    // Load the gtm script and container
    if (loadScript && containerId)
      addScript(containerId, domain || defaultDomain, dataLayerName);
  },

  push(event, config, mapping, options = {}) {
    const func = config.fn || (window.dataLayer as unknown[]).push;
    const { data } = options;
    const obj = { event: event.event }; // Use the name mapping by default

    func({
      ...obj,
      ...(isObject(data) ? data : event),
    });
  },
};

function addScript(containerId: string, src: string, dataLayerName: string) {
  const dl = dataLayerName != defaultDataLayer ? '&l=' + dataLayerName : '';
  const script = document.createElement('script');
  script.src = src + containerId + dl;
  document.head.appendChild(script);
}

export default destinationGTM;
