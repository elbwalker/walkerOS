import { Destination } from './types';

const defaultDataLayer = 'dataLayer';
const defaultDomain = 'https://www.googletagmanager.com/gtm.js?id=';

// Types
export * as DestinationGoogleGTM from './types';

export const destinationGoogleGTM: Destination = {
  type: 'google-gtm',

  config: {},

  init(config) {
    const w = window as unknown as Record<string, unknown[]>;
    const custom = config.custom || {};
    const dataLayer = custom.dataLayer || defaultDataLayer;

    w[dataLayer] = w[dataLayer] || [];

    w[dataLayer].push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });

    // Load the gtm script and container
    if (config.loadScript && custom.containerId)
      addScript(custom.containerId, custom.domain || defaultDomain, dataLayer);
  },

  push(event, config, mapping, options = {}) {
    (window.dataLayer as unknown[]).push(options.data ?? event);
  },
};

function addScript(containerId: string, src: string, dataLayerName: string) {
  const dl = dataLayerName != defaultDataLayer ? '&l=' + dataLayerName : '';
  const script = document.createElement('script');
  script.src = src + containerId + dl;
  document.head.appendChild(script);
}

export default destinationGoogleGTM;
