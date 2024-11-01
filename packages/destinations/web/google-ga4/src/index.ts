import type { WalkerOS } from '@elbwalker/types';
import type { Custom, Destination, Parameters } from './types';
import { getParams, getParamsInclude, getParamsItems } from './parameters';

// Types
export * as DestinationGoogleGA4 from './types';

export const destinationGoogleGA4: Destination = {
  type: 'google-ga4',

  config: { custom: { measurementId: '' } },

  init(config) {
    const w = window;
    const custom: Partial<Custom> = config.custom || {};
    const settings: WalkerOS.AnyObject = {};
    // required measurement id
    if (!custom.measurementId) return false;

    // custom transport url
    if (custom.transport_url) settings.transport_url = custom.transport_url;

    // custom server_container_url
    if (custom.server_container_url)
      settings.server_container_url = custom.server_container_url;

    // disable pageviews
    if (custom.pageview === false) settings.send_page_view = false;

    // Load the gtag script
    if (config.loadScript) addScript(custom.measurementId);

    // setup required methods
    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        (w.dataLayer as unknown[]).push(arguments);
      };
      w.gtag('js', new Date());
    }

    // gtag init call
    w.gtag('config', custom.measurementId, settings);
  },

  push(event, config, mapping = {}) {
    const custom = config.custom;
    const customEvent = mapping.custom || {};
    if (!custom) return;

    if (!custom.measurementId) return;

    const params = getParams(event, {
      // Prefer event mapping over general mapping
      ...custom.params,
      ...customEvent.params,
    });

    const paramsInclude = getParamsInclude(
      event,
      // Add data to include by default
      customEvent.include || custom.include || ['data'],
    );

    const paramsItems = getParamsItems(event, {
      // Prefer event item mapping over general item mapping
      ...(custom.items && custom.items.params),
      ...(customEvent.items && customEvent.items.params),
    });

    const eventParams: Parameters = {
      ...paramsInclude,
      ...paramsItems,
      ...params,
    };

    // Event name (snake_case default)
    let eventName = event.event; // Assume custom mapped name
    if (!mapping.name && custom.snakeCase !== false)
      // Use snake case if not mapped or disabled
      eventName = eventName.replace(' ', '_').toLowerCase();

    // Set the GA4 stream id
    eventParams.send_to = custom.measurementId;

    // Debug mode
    if (custom.debug) eventParams.debug_mode = true;

    window.gtag('event', eventName, eventParams);
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
