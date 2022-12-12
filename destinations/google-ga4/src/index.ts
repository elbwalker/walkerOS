import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    gtag: Function;
  }
}

export namespace DestinationGA4 {
  export interface Config extends WebDestination.Config {
    custom?: {
      measurementId?: string;
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

const destination: DestinationGA4.Function = {
  config: { custom: { measurementId: '' } },

  init(config: DestinationGA4.Config) {
    const custom = config.custom || {};
    const settings: IElbwalker.AnyObject = {};

    // required measuremt id
    if (!custom.measurementId) return false;

    // custom transport url
    if (custom.transport_url) settings.transport_url = custom.transport_url;

    // Load the gtag script
    if (config.loadScript) addScript(custom.measurementId);

    // setup required methods
    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        w.dataLayer!.push(arguments);
      };
      w.gtag('js', new Date());
    }

    // gtag init call
    w.gtag('config', custom.measurementId, settings);

    return true;
  },

  push(
    event: IElbwalker.Event,
    config?: DestinationGA4.Config,
    mapping: DestinationGA4.EventConfig = {},
  ) {
    config = config || {};
    const custom = config.custom || {};

    if (!custom.measurementId) return;

    let data = event.data || {};

    data.send_to = custom.measurementId;

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
