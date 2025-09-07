import type { Settings, Mapping, Destination } from './types';
import type { DestinationWeb } from '@walkeros/web-core';
import { getMappingValue, isArray } from '@walkeros/core';
import { getEnvironment } from '@walkeros/web-core';

// Types
export * as DestinationPiwikPro from './types';

// Examples
export * as destinationPiwikProExamples from './examples';

export const destinationPiwikPro: Destination = {
  type: 'piwikpro',

  config: {},

  init({ config, env }) {
    const { window } = getEnvironment(env);
    const w = window as Window;
    const { settings = {} as Partial<Settings>, loadScript } = config;
    const { appId, url } = settings;

    // Required parameters
    if (!appId || !url) return false;

    // Set up the Piwik Pro interface _paq
    w._paq = w._paq || [];

    const paq = w._paq.push;
    if (loadScript) {
      // Load the JavaScript Tracking Client
      addScript(url, env);

      // Register the tracker url only with script loading
      paq(['setTrackerUrl', url + 'ppms.php']);

      // Register app id
      paq(['setSiteId', appId]);
    }

    // Enable download and outlink tracking if not disabled
    if (settings.linkTracking !== false) paq(['enableLinkTracking']);

    return config;
  },

  async push(event, { config, mapping = {}, data, env }) {
    const { window } = getEnvironment(env);
    const paq = (window as Window)._paq!.push;

    // Send pageviews if not disabled
    if (event.name === 'page view' && !mapping.settings) {
      paq(['trackPageView', await getMappingValue(event, 'data.title')]);
      return;
    }

    const eventMapping: Mapping = mapping.settings || {};

    const parameters = isArray(data) ? data : [data];

    paq([event.name, ...parameters]);

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

function addScript(url: string, env?: DestinationWeb.Environment) {
  const { document } = getEnvironment(env);
  const doc = document as Document;
  const script = doc.createElement('script');
  script.type = 'text/javascript';
  script.src = url + 'ppms.js';
  script.async = true;
  script.defer = true;
  doc.head.appendChild(script);
}

export default destinationPiwikPro;
