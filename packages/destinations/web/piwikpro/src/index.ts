import type { Custom, CustomEvent, Destination } from './types';
import { getMappingValue } from '@elbwalker/utils';

// Types
export * as DestinationPiwikPro from './types';

export const destinationPiwikPro: Destination = {
  type: 'piwikpro',

  config: {},

  init(config) {
    const w = window;
    const { custom = {} as Partial<Custom>, fn, loadScript } = config;
    const { appId, url } = custom;

    // Required parameters
    if (!appId || !url) return false;

    // Set up the Piwik Pro interface _paq
    w._paq = w._paq || [];

    const func = fn || w._paq.push;
    if (loadScript) {
      // Load the JavaScript Tracking Client
      addScript(url);

      // Register the tracker url only with script loading
      func(['setTrackerUrl', url + 'ppms.php']);

      // Register app id
      func(['setSiteId', appId]);
    }

    // Enable download and outlink tracking if not disabled
    if (custom.linkTracking !== false) func(['enableLinkTracking']);
  },

  push(event, config, mapping = {}) {
    const { fn } = config;
    const func = fn || window._paq!.push;

    // Send pageviews if not disabled
    if (event.event === 'page view' && !mapping.custom) {
      func(['trackPageView', getMappingValue(event, 'data.title')]);
      return;
    }

    const customMapping: CustomEvent = mapping.custom || {};

    let name: unknown, value: unknown; // @TODO fix types

    if (customMapping) {
      if (customMapping.name) name = getMappingValue(event, customMapping.name);
      if (customMapping.value)
        value = getMappingValue(event, customMapping.value);
    }

    func([
      'trackEvent',
      event.entity,
      event.action,
      name,
      value,
      // @TODO dimensions
    ]);

    if (customMapping.goalId) {
      const goalValue = customMapping.goalValue
        ? getMappingValue(event, customMapping.goalValue)
        : undefined;

      func([
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
