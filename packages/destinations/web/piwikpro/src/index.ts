import type { CustomConfig, CustomEventConfig, Function } from './types';
import { getByStringDot } from '@elbwalker/utils';

// @TODOs
// - static values besides dynamic data values
// - site search
// - e-commerce support
// - support for dimensions
// - testing

// Types
export * as DestinationPiwikPro from './types';

export const destinationPiwikPro: Function = {
  type: 'piwikpro',

  config: {},

  init(config) {
    const w = window;
    const custom: Partial<CustomConfig> = config.custom || {};

    // Required parameters
    if (!custom.appId || !custom.url) return false;

    // Set up the Piwik Pro interface _paq
    w._paq = w._paq || [];

    if (config.loadScript) {
      // Load the JavaScript Tracking Client
      addScript(custom.url);

      // Register the tracker url only with script loading
      w._paq.push(['setTrackerUrl', custom.url + 'ppms.php']);

      // Register app id
      w._paq.push(['setSiteId', custom.appId]);
    }

    // Enable download and outlink tracking if not disabled
    if (custom.linkTracking !== false) w._paq.push(['enableLinkTracking']);

    return true;
  },

  push(event, config, mapping = {}) {
    const custom: Partial<CustomConfig> = config.custom || {};

    // Send pageviews if not disabled
    if (
      custom.pageview !== false &&
      event.entity === 'page' &&
      event.action === 'view'
    ) {
      // Pageview tracking will move to run part in next version
      window._paq!.push(['trackPageView', getByStringDot(event, 'data.title')]);

      return;
    }

    const customMapping: CustomEventConfig = mapping.custom || {};

    let name: unknown, value: unknown; // @TODO fix types

    if (customMapping) {
      if (customMapping.name) name = getByStringDot(event, customMapping.name);
      if (customMapping.value)
        value = getByStringDot(event, customMapping.value);
    }

    window._paq!.push([
      'trackEvent',
      event.entity,
      event.action,
      name,
      value,
      // @TODO dimensions
    ]);

    if (customMapping.goalId) {
      const goalValue = customMapping.goalValue
        ? getByStringDot(event, customMapping.goalValue)
        : undefined;

      window._paq!.push([
        'trackGoal',
        customMapping.goalId,
        goalValue,
        // @TODO dimensions
      ]);
    }
  },
};

function addScript(url: string) {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url + 'ppms.js';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export default destinationPiwikPro;
