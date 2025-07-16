import type { WalkerOS } from '@walkerOS/core';
import type { Settings, Destination, Parameters } from './types';
import { getParamsInclude } from './parameters';
import { isObject } from '@walkerOS/core';

// Types
export * as DestinationGA4 from './types';

// Examples
export * as examples from './examples';

export const destinationGA4: Destination = {
  type: 'google-ga4',

  config: { settings: { measurementId: '' } },

  init({ config, wrap }) {
    const w = window;
    const { settings = {} as Partial<Settings>, loadScript } = config;
    const { measurementId, transport_url, server_container_url, pageview } =
      settings;

    if (!measurementId) return false;

    // Load the gtag script
    if (loadScript) addScript(measurementId);

    const gtagSettings: WalkerOS.AnyObject = {};

    // custom transport_url
    if (transport_url) gtagSettings.transport_url = transport_url;

    // custom server_container_url
    if (server_container_url)
      gtagSettings.server_container_url = server_container_url;

    // disable pageviews
    if (pageview === false) gtagSettings.send_page_view = false;

    // setup required methods
    w.dataLayer = w.dataLayer || [];

    if (!w.gtag) {
      w.gtag = function () {
        (w.dataLayer as unknown[]).push(arguments);
      };
    }

    const gtag = wrap('gtag', w.gtag);
    gtag('js', new Date());

    // gtag init call
    gtag('config', measurementId, gtagSettings);
  },

  push(event, { config, mapping = {}, data, wrap }) {
    const { settings } = config;
    const eventMapping = mapping.settings || {};
    if (!settings) return;

    if (!settings.measurementId) return;

    const eventData = isObject(data) ? data : {};

    const paramsInclude = getParamsInclude(
      event,
      // Add data to include by default
      eventMapping.include || settings.include || ['data'],
    );

    const eventParams: Parameters = {
      ...paramsInclude,
      ...eventData,
    };

    // Event name (snake_case default)
    let eventName = event.event; // Assume custom mapped name
    if (!mapping.name && settings.snakeCase !== false)
      // Use snake case if not mapped or disabled
      eventName = eventName.replace(' ', '_').toLowerCase();

    // Set the GA4 stream id
    eventParams.send_to = settings.measurementId;

    // Debug mode
    if (settings.debug) eventParams.debug_mode = true;

    const gtag = wrap('gtag', window.gtag);
    gtag('event', eventName, eventParams);
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

export default destinationGA4;
