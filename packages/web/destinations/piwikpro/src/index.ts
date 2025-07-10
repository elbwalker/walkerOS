import type { Settings, Mapping, Destination } from './types';
import { getMappingValue, isArray } from '@walkerOS/web-collector';

// Types
export * as DestinationPiwikPro from './types';

// Examples
export * as destinationPiwikProExamples from './examples';

export const destinationPiwikPro: Destination = {
  type: 'piwikpro',

  config: {},

  init({ config }) {
    const w = window;
    const { settings = {} as Partial<Settings>, fn, loadScript } = config;
    const { appId, url } = settings;

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
    if (settings.linkTracking !== false) func(['enableLinkTracking']);
  },

  async push(event, { config, mapping = {}, data }) {
    const { fn } = config;
    const func = fn || window._paq!.push;

    // Send pageviews if not disabled
    if (event.event === 'page view' && !mapping.settings) {
      func(['trackPageView', await getMappingValue(event, 'data.title')]);
      return;
    }

    const eventMapping: Mapping = mapping.settings || {};

    const parameters = isArray(data) ? data : [data];

    func([event.event, ...parameters]);

    if (eventMapping.goalId) {
      const goalValue = eventMapping.goalValue
        ? getMappingValue(event, eventMapping.goalValue)
        : undefined;

      func([
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
