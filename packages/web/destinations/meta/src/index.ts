import type { Settings, Destination } from './types';
import { addScript, setup } from './setup';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

// Types
export * as DestinationMeta from './types';

export const destinationMeta: Destination = {
  type: 'meta-pixel',

  config: {},

  init({ config, env, logger }) {
    const { settings, loadScript } = config;
    const { pixelId } = settings || {};

    // Load Meta Pixel script if required (fbevents.js)
    if (loadScript) addScript(env);

    // Required pixel id
    if (!pixelId) logger.throw('Config settings pixelId missing');

    // fbq function setup
    setup(env);

    const { window } = getEnv(env);
    const fbq = window.fbq as facebook.Pixel.Event;
    fbq('init', pixelId!);
  },

  push(event, { config, rule = {}, data, env }) {
    const { track, trackCustom } = rule.settings || {};
    const { window } = getEnv(env);
    const fbq = window.fbq as facebook.Pixel.Event;

    // page view
    if (event.name === 'page view' && !rule.settings) {
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
