import type { Custom, Destination } from './types';
import { addScript, setup } from './setup';
import { getMappingValue, isObject } from '@elbwalker/utils';

// Types
export * as DestinationMetaPixel from './types';

export const destinationMetaPixel: Destination = {
  type: 'meta-pixel',

  config: {},

  init(config) {
    const { custom = {} as Partial<Custom>, fn, loadScript } = config;
    const { pixelId, pageview } = custom;

    // Load Meta Pixel script if required (fbevents.js)
    if (loadScript) addScript();

    // Required pixel id
    if (!pixelId) return false;

    // fbq function setup
    setup();

    const func = fn || window.fbq;
    func('init', pixelId);

    // PageView event (default yes, deactivate actively)
    if (pageview !== false) window.fbq('track', 'PageView');
  },

  push(event, config, mapping = {}, options = {}) {
    const { fn } = config;
    const { track, trackCustom } = mapping.custom || {};
    const { data, instance } = options;

    const eventName =
      getMappingValue(event, track || trackCustom || '', {
        instance,
      }) || event.event;

    const func = fn || window.fbq;
    func(
      trackCustom ? 'trackCustom' : 'track',
      String(eventName),
      isObject(data) ? data : {},
    );
  },
};

export default destinationMetaPixel;
