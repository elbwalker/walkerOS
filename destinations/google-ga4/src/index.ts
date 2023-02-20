import { IElbwalker, Walker } from '@elbwalker/walker.js';
import { DestinationGoogleGA4 } from './types';

const destinationGoogleGA4: DestinationGoogleGA4.Function = {
  config: { custom: { measurementId: '' } },

  init(config: DestinationGoogleGA4.Config) {
    const w = window;
    const custom: Partial<DestinationGoogleGA4.CustomConfig> =
      config.custom || {};
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

  push(event, config) {
    const custom = config.custom;
    if (!custom) return;

    if (!custom.measurementId) return;

    let data: Gtag.ControlParams & Gtag.EventParams & Gtag.CustomParams = {};

    // Override event parameters complete if properties are set
    if (custom.properties) {
      Object.entries(custom.properties).forEach(([prop, key]) => {
        // @TODO prefere event mapping
        data[prop] = event.data[key];
      });
    } else {
      data = event.data;
    }

    data.send_to = custom.measurementId;

    // Debug mode
    if (custom.debug) data.debug_mode = true;

    window.gtag('event', event.event, data);
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

export default destinationGoogleGA4;
