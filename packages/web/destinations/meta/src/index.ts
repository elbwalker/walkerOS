import type { Settings, Destination } from './types';
import { addScript, setup } from './setup';
import { isObject } from '@walkerOS/core';

// Types
export * as DestinationMeta from './types';

// Examples
export * as destinationMetaExamples from './examples';

export const destinationMeta: Destination = {
  type: 'meta-pixel',

  config: {},

  init({ config, wrap }) {
    const { settings = {} as Partial<Settings>, loadScript } = config;
    const { pixelId } = settings;

    // Load Meta Pixel script if required (fbevents.js)
    if (loadScript) addScript();

    // Required pixel id
    if (!pixelId) return false;

    // fbq function setup
    setup();

    const fbq = wrap('fbq', window.fbq);
    fbq('init', pixelId);
  },

  push(event, { config, mapping = {}, data, wrap }) {
    const { track, trackCustom } = mapping.settings || {};
    const fbq = wrap('fbq', window.fbq);

    // page view
    if (event.event === 'page view' && !mapping.settings) {
      // Define a custom mapping
      event.event = 'PageView';
    }

    const eventName = track || trackCustom || event.event;

    fbq(
      trackCustom ? 'trackCustom' : 'track',
      String(eventName),
      isObject(data) ? data : {},
      { eventID: event.id },
    );
  },
};

export default destinationMeta;
