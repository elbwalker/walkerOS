import { DestinationGoogleGTM } from './types';

const defaultDataLayer = 'dataLayer';
const defaultDomain = 'https://www.googletagmanager.com/gtm.js?id=';

export const destinationGoogleGTM: DestinationGoogleGTM.Function = {
  config: {},

  init(config: DestinationGoogleGTM.Config) {
    const custom = config.custom || {};
    const dataLayer = custom.dataLayer || defaultDataLayer;

    window[dataLayer as any] = window[dataLayer as any] || [];

    (window as any)[dataLayer].push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });

    // Load the gtm script and container
    if (config.loadScript && custom.containerId)
      addScript(custom.containerId, custom.domain || defaultDomain, dataLayer);

    return true;
  },

  push(event) {
    window.dataLayer!.push({
      ...event,
      walker: true,
    });
  },
};

function addScript(containerId: string, src: string, dataLayerName: string) {
  const dl = dataLayerName != defaultDataLayer ? '&l=' + dataLayerName : '';
  const script = document.createElement('script');
  script.src = src + containerId + dl;
  document.head.appendChild(script);
}

export default destinationGoogleGTM;
