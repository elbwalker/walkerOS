import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    [dataLayer: string]: unknown[];
  }
}

export namespace DestinationGTM {
  export interface Config extends WebDestination.Config {
    custom?: {
      containerId?: string; // GTM-XXXXXXX
      dataLayer?: string; // dataLayer
      domain?: string; // Source domain of the GTM
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    // Custom destination event mapping properties
  }

  export type ExclusionParameters = string[];
}

const defaultDataLayer = 'dataLayer';
const defaultDomain = 'https://www.googletagmanager.com/gtm.js?id=';

export const destination: DestinationGTM.Function = {
  config: {},

  init() {
    let config = this.config;
    config.custom = config.custom || {};

    const dataLayer = config.custom.dataLayer || defaultDataLayer;

    window[dataLayer] = window[dataLayer] || [];

    window[dataLayer].push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });

    // Load the gtm script and container
    if (config.loadScript && config.custom.containerId)
      addScript(
        config.custom.containerId,
        config.custom.domain || defaultDomain,
        dataLayer,
      );

    return true;
  },

  push(event: IElbwalker.Event): void {
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

export default destination;
