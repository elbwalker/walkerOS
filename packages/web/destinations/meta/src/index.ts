import type { Settings, Destination } from './types';
import { addScript, setup } from './setup';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

// Types
export * as DestinationMeta from './types';

// Examples
export * as examples from './examples';

// Schemas
export * as schemas from './schemas';

export const destinationMeta: Destination = {
  type: 'meta-pixel',

  config: {},

  init({ config, env }) {
    const { settings, loadScript } = config;
    const { pixelId } = settings || {};

    // Load Meta Pixel script if required (fbevents.js)
    if (loadScript) addScript(env);

    // Required pixel id
    if (!pixelId) return false;

    // fbq function setup
    setup(env);

    const { window } = getEnv(env);
    const fbq = window.fbq as facebook.Pixel.Event;
    fbq('init', pixelId);
  },

  push(event, { config, mapping = {}, data, env }) {
    const { track, trackCustom } = mapping.settings || {};
    const { window } = getEnv(env);
    const fbq = window.fbq as facebook.Pixel.Event;

    // page view
    if (event.name === 'page view' && !mapping.settings) {
      // Define a custom mapping
      event.name = 'PageView';
    }

    const eventName = track || trackCustom || event.name;

    fbq(
      trackCustom ? 'trackCustom' : 'track',
      String(eventName),
      isObject(data) ? data : {},
      { eventID: event.id },
    );
  },
};

export default destinationMeta;
