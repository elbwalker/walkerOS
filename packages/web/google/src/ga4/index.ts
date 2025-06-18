import type { WalkerOS } from '@elbwalker/types';
import type { Custom, Destination, Parameters } from './types';
import { getParamsInclude } from './parameters';
import { isObject } from '@walkerOS/utils';

// Types
export * as DestinationGA4 from './types';

export const destinationGA4: Destination = {
  type: 'google-ga4',

  config: { custom: { measurementId: '' } },

  init(config = {}) {
    const w = window;
    const { custom = {} as Partial<Custom>, fn, loadScript } = config;
    const { measurementId, transport_url, server_container_url, pageview } =
      custom;

    if (!measurementId) return false;

    // Load the gtag script
    if (loadScript) addScript(measurementId);

    const settings: WalkerOS.AnyObject = {};

    // custom transport_url
    if (transport_url) settings.transport_url = transport_url;

    // custom server_container_url
    if (server_container_url)
      settings.server_container_url = server_container_url;

    // disable pageviews
    if (pageview === false) settings.send_page_view = false;

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
    func('config', measurementId, settings);
  },

  push(event, config, mapping = {}, options = {}) {
    const { custom, fn } = config;
    const customEvent = mapping.custom || {};
    if (!custom) return;

    if (!custom.measurementId) return;

    const data = isObject(options.data) ? options.data : {};

    const paramsInclude = getParamsInclude(
      event,
      // Add data to include by default
      customEvent.include || custom.include || ['data'],
    );

    const eventParams: Parameters = {
      ...paramsInclude,
      ...data,
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
