import { Elbwalker, WebDestination } from "../../types";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag: Function;
  }
}

export interface DestinationGA4 extends WebDestination.Function {
  config: WebDestination.Config & {
    measurementId?: string;
    transport_url?: string;
  };
}

const w = window;
let measurementId: string;

export const destination: DestinationGA4 = {
  config: {},

  init() {
    let config = this.config;
    const settings: Elbwalker.AnyObject = {};

    // required measuremt id
    if (!config.measurementId) return false;
    measurementId = config.measurementId;

    // custom transport url
    if (config.transport_url) settings.transport_url = config.transport_url;

    // setup required methods
    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        w.dataLayer!.push(arguments);
      };
      w.gtag('js', 's');
      // w.gtag('js', new Date());
    }

    // gtag init call
    w.gtag('config', measurementId, settings);

    return true;
  },

  push(event: Elbwalker.Event) {
    let data = event.data || {};
    data.send_to = measurementId;

    w.gtag('event', `${event.entity} ${event.action}`, data);
  },
};

export default destination;
