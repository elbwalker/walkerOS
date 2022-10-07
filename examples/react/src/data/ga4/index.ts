import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag: Function;
  }
}

export interface DestinationGA4Config extends WebDestination.Config {
  loadScript?: boolean;
  measurementId?: string;
  transport_url?: string;
}

export interface DestinationGA4 extends WebDestination.Function {
  config: DestinationGA4Config;
}

const w = window;
let measurementId: string;

export const destination: DestinationGA4 = {
  config: {},

  init() {
    let config = this.config;
    const settings: IElbwalker.AnyObject = {};

    // required measuremt id
    if (!config.measurementId) return false;
    measurementId = config.measurementId;

    if (config.loadScript) addScript(config.measurementId);

    // custom transport url
    if (config.transport_url) settings.transport_url = config.transport_url;

    // setup required methods
    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        w.dataLayer!.push(arguments);
      };
      w.gtag('js', new Date());
    }

    // gtag init call
    w.gtag('config', measurementId, settings);

    return true;
  },

  push(event: IElbwalker.Event, mapping?: WebDestination.MappingEvent) {
    let data = event.data || {};
    data.send_to = measurementId;

    let eventName = `${event.entity} ${event.action}`;
    if (mapping && mapping.custom) {
      if (mapping.custom.ignore) return;
      if (mapping.custom.event) {
        eventName = mapping.custom.event as string;
      }
    }

    w.gtag('event', eventName, data);
  },
};

function addScript(
  measurementId: string,
  src = 'https://www.googletagmanager.com/gtag/js?id=',
) {
  const script = document.createElement('script');

  src = src + measurementId;
  script.src = src;
  document.head.appendChild(script);
}

export default destination;
