import type { Custom, Destination } from './types';
import { addScript, setup } from './setup';
import { isObject } from '@elbwalker/utils';

// Types
export * as DestinationMetaPixel from './types';

export const destinationMetaPixel: Destination = {
  type: 'meta-pixel',

  config: {},

  init(config = {}) {
    const { custom = {} as Partial<Custom>, fn, loadScript } = config;
    const { pixelId } = custom;

    // Load Meta Pixel script if required (fbevents.js)
    if (loadScript) addScript();

    // Required pixel id
    if (!pixelId) return false;

    // fbq function setup
    setup();

    const func = fn || window.fbq;
    func('init', pixelId);
  },

  push(event, config, mapping = {}, options = {}) {
    const { fn } = config;
    const { track, trackCustom } = mapping.custom || {};
    const { data } = options;
    const func = fn || window.fbq;

    // page view
    if (event.event === 'page view' && !mapping.custom) {
      // Define a custom mapping
      event.event = 'PageView';
    }

    const eventName = track || trackCustom || event.event;

    func(
      trackCustom ? 'trackCustom' : 'track',
      String(eventName),
      isObject(data) ? data : {},
      { eventID: event.id },
    );
  },
};

export default destinationMetaPixel;
