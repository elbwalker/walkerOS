import type { Mapping, Destination, Env } from './types';
import { getMappingValue, isArray } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

// Types
export * as DestinationPiwikPro from './types';

export const destinationPiwikPro: Destination = {
  type: 'piwikpro',

  config: {},

  init({ config, env, logger }) {
    const { window } = getEnv<Env>(env);
    const { settings, loadScript } = config;
    const { appId, url } = settings || {};

    // Required parameters
    if (!appId) logger.throw('Config settings appId missing');
    if (!url) logger.throw('Config settings url missing');

    // Set up the Piwik Pro interface _paq
    window._paq = window._paq || [];

    const paq = window._paq.push;
    if (loadScript) {
      // Load the JavaScript Tracking Client
      addScript(url!, env);

      // Register the tracker url only with script loading
      paq(['setTrackerUrl', url + 'ppms.php']);

      // Register app id
      paq(['setSiteId', appId]);
    }

    // Enable download and outlink tracking if not disabled
    if (settings?.linkTracking !== false) paq(['enableLinkTracking']);
  },

  async push(event, { rule = {}, data, env, collector }) {
    const { window } = getEnv<Env>(env);
    const paq = window._paq!.push;

    // Send pageviews if not disabled
    if (event.name === 'page view' && !rule.settings) {
      paq([
        'trackPageView',
        await getMappingValue(event, 'data.title', { collector }),
      ]);
      return;
    }

    const eventMapping: Mapping = rule.settings || {};

    const parameters = isArray(data) ? data : [data];

    paq([event.name, ...parameters]);

    if (eventMapping.goalId) {
      const goalValue = eventMapping.goalValue
        ? getMappingValue(event, eventMapping.goalValue, { collector })
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

function addScript(url: string, env?: Env) {
  const { document } = getEnv<Env>(env);
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url + 'ppms.js';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export default destinationPiwikPro;
