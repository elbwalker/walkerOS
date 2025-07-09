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

  init(config = {}) {
    const w = window;
    const { settings = {} as Partial<Settings>, fn, loadScript } = config;
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

    let func = fn || w.gtag;
    if (!w.gtag) {
      w.gtag = function () {
        (w.dataLayer as unknown[]).push(arguments);
      };
      func = func || w.gtag;
      func('js', new Date());
    }

    // gtag init call
    func('config', measurementId, gtagSettings);
  },

  push(event, config, mapping = {}, options = {}) {
    const { settings, fn } = config;
    const eventMapping = mapping.settings || {};
    if (!settings) return;

    if (!settings.measurementId) return;

    const data = isObject(options.data) ? options.data : {};

    const paramsInclude = getParamsInclude(
      event,
      // Add data to include by default
      eventMapping.include || settings.include || ['data'],
    );

    const eventParams: Parameters = {
      ...paramsInclude,
      ...data,
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

    const func = fn || window.gtag;
    func('event', eventName, eventParams);
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
