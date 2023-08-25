import type { Elbwalker } from '@elbwalker/types';
import type {
  CustomConfig,
  Function,
  Items,
  Parameters,
  PropertyMapping,
} from './types';

const destinationGoogleGA4: Function = {
  type: 'google-ga4',

  config: { custom: { measurementId: '' } },

  init(config) {
    const w = window;
    const custom: Partial<CustomConfig> = config.custom || {};
    const settings: Elbwalker.AnyObject = {};
    // required measuremt id
    if (!custom.measurementId) return false;

    // custom transport url
    if (custom.transport_url) settings.transport_url = custom.transport_url;

    // disable pageviews
    if (custom.pageview === false) settings.send_page_view = false;

    // Load the gtag script
    if (config.loadScript) addScript(custom.measurementId);

    // setup required methods
    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        (w.dataLayer as unknown[]).push(arguments);
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

    let eventParams: Parameters = {};

    // Add data to include by default
    let include = customEvent.include || custom.include || ['data'];

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
      let group = event[groupName as keyof Omit<Elbwalker.Event, 'all'>];

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
        if (groupName == 'context')
          val = (val as Elbwalker.OrderedProperties)[0];

        eventParams[`${groupName}_${key}`] = val;
      });
    });

    // Parameters
    Object.assign(
      eventParams,
      getMappedParams(
        {
          // Prefer event mapping over general mapping
          ...custom.params,
          ...customEvent.params,
        },
        event,
      ),
    );

    // Item parameters
    const items: Items = [];
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

function getMappedParams(
  mapping: PropertyMapping,
  event: Elbwalker.Event,
  i: number = 0,
) {
  let params: Parameters = {};

  Object.entries(mapping).forEach(([prop, keyRef]) => {
    let key: string;
    let defaultValue: Elbwalker.PropertyType | undefined;

    if (typeof keyRef == 'string') {
      key = keyRef;
    } else {
      key = keyRef.key;
      defaultValue = keyRef.default;
    }

    // String dot notation for object ("data.id" -> { data: { id: 1 } })
    const value = getByStringDot(event, key, i) || defaultValue;

    if (value) params[prop] = value;
  });

  return Object.keys(params).length ? params : false;
}

function getByStringDot(event: unknown, key: string, i: number): unknown {
  // String dot notation for object ("data.id" -> { data: { id: 1 } })
  const value = key.split('.').reduce((obj, key) => {
    // Update the wildcard to the given index
    if (key == '*') key = String(i);

    if (obj instanceof Object) return obj[key as keyof typeof obj];

    return;
  }, event);

  return value;
}

export default destinationGoogleGA4;
