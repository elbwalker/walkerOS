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

  push(event, config, mapping = {}) {
    const custom = config.custom;
    const customEvent = mapping.custom || {};
    if (!custom) return;

    if (!custom.measurementId) return;

    let eventParams: DestinationGoogleGA4.Parameters = {};

    // Parameters
    eventParams =
      getMappedParams(
        {
          // Prefer event mapping over general mapping
          ...custom.params,
          ...customEvent.params,
        },
        event,
      ) || event.data;

    // Item parameters
    const items: DestinationGoogleGA4.Items = [];
    // Loop for each nested entity but at least one time
    for (var i = 0, l = event.nested.length || 1; i < l; i++) {
      const item = getMappedParams(
        {
          // Prefer event item mapping over general item mapping
          ...(custom.items && custom.items.params),
          ...(customEvent.items && customEvent.items.params),
        },
        event,
        i,
      );
      if (item) items.push(item);
    }
    if (items.length) eventParams.items = items;

    // Set the GA4 stream id
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

function getMappedParams(
  mapping: DestinationGoogleGA4.PropertyMapping,
  event: IElbwalker.Event,
  i: number = 0,
) {
  let params: DestinationGoogleGA4.Parameters = {};

  Object.entries(mapping).forEach(([prop, keyRef]) => {
    let key: string;
    let defaultValue: Walker.PropertyType | undefined;

    if (typeof keyRef == 'string') {
      key = keyRef;
    } else {
      key = keyRef.key;
      defaultValue = keyRef.default;
    }

    // String dot notation for object ("data.id" -> { data: { id: 1 } })
    const value = key.split('.').reduce((obj, key) => {
      // Update the wildcard to the current nested index
      if (key == '*') key = String(i);

      return obj[key] || defaultValue;
    }, event);

    if (value) params[prop] = value;
  });

  return Object.keys(params).length ? params : false;
}

export default destinationGoogleGA4;
