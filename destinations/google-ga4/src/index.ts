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
  }

  export interface Function extends WebDestination.Function {
    config: Config;
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

  push(event: IElbwalker.Event, mapping?: WebDestination.EventConfig) {
    let data = event.data || {};
    data.send_to = this.config.custom.measurementId;

    w.gtag('event', `${event.entity} ${event.action}`, data);
  },
};

export default destination;
