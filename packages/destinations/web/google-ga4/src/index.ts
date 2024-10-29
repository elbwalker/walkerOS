import type { WalkerOS } from '@elbwalker/types';
import type {
  CustomConfig,
  Destination,
  GtagItems,
  Include,
  Parameters,
  Params,
} from './types';
import { getMappingValue } from '@elbwalker/utils';

// Types
export * as DestinationGoogleGA4 from './types';

export const destinationGoogleGA4: Destination = {
  type: 'google-ga4',

  config: { custom: { measurementId: '' } },

  init(config) {
    const w = window;
    const custom: Partial<CustomConfig> = config.custom || {};
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

function getParamsInclude(event: WalkerOS.Event, include: Include): Parameters {
  const params: Parameters = {};

  // Check for the 'all' group to add each group
  if (include.includes('all'))
    include = [
      'context',
      'data',
      'event',
      'globals',
      'source',
      'user',
      'version',
    ];

  include.forEach((groupName) => {
    let group = event[groupName as keyof Omit<WalkerOS.Event, 'all'>];

    // Create a fake group for event properties
    if (groupName == 'event')
      group = {
        id: event.id,
        timing: event.timing,
        trigger: event.trigger,
        entity: event.entity,
        action: event.action,
        group: event.group,
        count: event.count,
      };

    Object.entries(group).forEach(([key, val]) => {
      // Different value access for context
      if (groupName == 'context') val = (val as WalkerOS.OrderedProperties)[0];

      params[`${groupName}_${key}`] = val;
    });
  });

  return params;
}

function getParams(event: WalkerOS.Event, mapping: Params): Parameters {
  const params = Object.entries(mapping).reduce((acc, [key, mapping]) => {
    const value = getMappingValue(event, mapping);
    if (value) acc[key] = value;
    return acc;
  }, {} as Parameters);

  return params;
}

function getParamsItems(event: WalkerOS.Event, mapping: Params): Parameters {
  let itemsCount = 0; // This will become the total items
  const params = Object.entries(mapping).reduce((acc, [key, mapping]) => {
    const value = getMappingValue(event, mapping);
    if (value) {
      itemsCount = itemsCount || 1;
      // Define the number of items based on the longest array
      if (Array.isArray(value) && value.length > itemsCount)
        itemsCount = value.length;

      acc[key] = value;
    }

    return acc;
  }, {} as Parameters);

  const items: GtagItems = [];
  for (let i = 0; i < itemsCount; i++) {
    const item = (items[i] = {} as Gtag.Item);
    Object.entries(params).forEach(([key, paramValue]) => {
      const value = Array.isArray(paramValue) ? paramValue[i] : paramValue;
      if (value) item[key as keyof Gtag.Item] = value;
    });
  }

  return items.length ? { items } : {};
}

export default destinationGoogleGA4;
