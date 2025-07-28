import type { Settings, Mapping, Destination } from './types';
import { getMappingValue, isArray } from '@walkeros/core';

// Types
export * as DestinationPiwikPro from './types';

// Examples
export * as destinationPiwikProExamples from './examples';

export const destinationPiwikPro: Destination = {
  type: 'piwikpro',

  config: {},

  init({ config, wrap }) {
    const w = window;
    const { settings = {} as Partial<Settings>, loadScript } = config;
    const { appId, url } = settings;

    // Required parameters
    if (!appId || !url) return false;

    // Set up the Piwik Pro interface _paq
    w._paq = w._paq || [];

    const paq = wrap('_paq.push', w._paq.push);
    if (loadScript) {
      // Load the JavaScript Tracking Client
      addScript(url);

      // Register the tracker url only with script loading
      paq(['setTrackerUrl', url + 'ppms.php']);

      // Register app id
      paq(['setSiteId', appId]);
    }

    // Enable download and outlink tracking if not disabled
    if (settings.linkTracking !== false) paq(['enableLinkTracking']);
  },

  async push(event, { config, mapping = {}, data, wrap }) {
    const paq = wrap('_paq.push', window._paq!.push);

    // Send pageviews if not disabled
    if (event.event === 'page view' && !mapping.settings) {
      paq(['trackPageView', await getMappingValue(event, 'data.title')]);
      return;
    }

    const eventMapping: Mapping = mapping.settings || {};

    const parameters = isArray(data) ? data : [data];

    paq([event.event, ...parameters]);

    if (eventMapping.goalId) {
      const goalValue = eventMapping.goalValue
        ? getMappingValue(event, eventMapping.goalValue)
        : undefined;

      paq([
        'trackGoal',
        eventMapping.goalId,
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
