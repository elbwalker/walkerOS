import type { Destination } from './types';
import { addScript, setup } from './setup';
import { getMappingValue, isObject } from '@elbwalker/utils';

// Types
export * as DestinationMetaPixel from './types';

export const destinationMetaPixel: Destination = {
  type: 'meta-pixel',

  config: {},

  init(config) {
    const custom = config.custom || {};

    // Load Meta Pixel script if required (fbevents.js)
    if (config.loadScript) addScript();

    // Required pixel id
    if (!custom.pixelId) return false;

    // fbq function setup
    setup();

    window.fbq('init', custom.pixelId);

    // PageView event (default yes, deactivate actively)
    if (custom.pageview !== false) window.fbq('track', 'PageView');
  },

  push(event, config, mapping = {}, instance) {
    const { track, trackCustom, parameters = {} } = mapping.custom || {};

    const eventName =
      getMappingValue(event, track || trackCustom || '', {
        instance,
      }) || event.event;

    const parametersValue = getMappingValue(
      event,
      { map: parameters },
      {
        instance,
      },
    );

    window.fbq(
      trackCustom ? 'trackCustom' : 'track',
      String(eventName),
      isObject(parametersValue) ? parametersValue : {},
    );
  },
};

export default destinationMetaPixel;
