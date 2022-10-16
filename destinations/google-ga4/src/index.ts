import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag: Function;
  }
}

export namespace DestinationGA4 {
  export interface Config extends WebDestination.Config {
    custom: {
      measurementId: string;
      transport_url?: string;
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    // Custom destination event mapping properties
  }
}

const w = window;

export const destination: DestinationGA4.Function = {
  config: { custom: { measurementId: '' } },

  init() {
    let config = this.config;
    const settings: IElbwalker.AnyObject = {};

    // required measuremt id
    if (!config.custom.measurementId) return false;

    // custom transport url
    if (config.custom.transport_url)
      settings.transport_url = config.custom.transport_url;

    // Load the gtag script
    if (config.loadScript) addScript(config.custom.measurementId);

    // setup required methods
    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        w.dataLayer!.push(arguments);
      };
      w.gtag('js', new Date());
    }

    // gtag init call
    w.gtag('config', config.custom.measurementId, settings);

    return true;
  },

  push(event: IElbwalker.Event, mapping: DestinationGA4.EventConfig = {}) {
    let data = event.data || {};
    data.send_to = this.config.custom.measurementId;

    w.gtag('event', event.event, data);
  },
};

function addScript(
  measurementId: string,
  src = 'https://www.googletagmanager.com/gtag/js?id=',
) {
  const script = document.createElement('script');
  script.src = src + measurementId;
  document.head.appendChild(script);
}

export default destination;
