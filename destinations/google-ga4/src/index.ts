import { IElbwalker } from '@elbwalker/walker.js';
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

  push(event, config, mapping = {}) {
    const custom = config.custom;
    const customEvent = mapping.custom || {};
    if (!custom) return;

    if (!custom.measurementId) return;

    let eventParams: Gtag.ControlParams & Gtag.EventParams & Gtag.CustomParams =
      {};

    // Parameters
    const params = Object.entries({
      // Prefer event mapping over general mapping
      ...custom.params,
      ...customEvent.params,
    });
    if (params.length) {
      // Override event parameters completely if properties are set
      params.forEach(([prop, key]) => {
        // String dot notation for object ("data.id" -> { data: { id: 1 } })
        const value = key.split('.').reduce((o, i) => o[i], event);
        if (value) eventParams[prop] = value;
      });
    } else {
      // No properties mapping
      eventParams = event.data;
    }

    // Item parameters
    const itemParams = Object.entries({
      // Prefer event item mapping over general item mapping
      ...(custom.items && custom.items.params),
      ...(customEvent.items && customEvent.items.params),
    });
    if (itemParams.length) {
      // let items: Gtag.Item[] = [];
      let item: Gtag.Item = {};

      itemParams.forEach(([prop, key]) => {
        // String dot notation for object ("data.id" -> { data: { id: 1 } })
        const value = key.split('.').reduce((o, i) => o[i], event);
        if (value) item[prop] = key.split('.').reduce((o, i) => o[i], event);
      });

      eventParams.items = [item];
    }

    eventParams.send_to = custom.measurementId;

    // Debug mode
    if (custom.debug) eventParams.debug_mode = true;

    window.gtag('event', event.event, eventParams);
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
