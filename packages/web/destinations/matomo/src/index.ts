import type { Mapping, Destination } from './types';
import type { DestinationWeb } from '@walkeros/web-core';
import { getMappingValue, isArray } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

// Types
export * as DestinationMatomo from './types';

export const destinationMatomo: Destination = {
  type: 'matomo',

  config: {},

  init({ config, env, logger }) {
    const { window } = getEnv(env);
    const w = window as Window;
    const { settings, loadScript } = config;
    const { siteId, url } = settings || {};

    // Required parameters
    if (!siteId) logger.throw('Config settings siteId missing');
    if (!url) logger.throw('Config settings url missing');

    // Set up the Matomo command queue
    w._paq = w._paq || [];
    const paq = w._paq.push.bind(w._paq);

    if (loadScript) {
      // Load the Matomo tracking script
      addScript(url!, env);

      // Configure tracker URL and site ID
      paq(['setTrackerUrl', url + 'matomo.php']);
      paq(['setSiteId', siteId]);
    }

    // Cookie-free tracking
    if (settings?.disableCookies) paq(['disableCookies']);

    // Enable link tracking by default
    if (settings?.enableLinkTracking !== false) paq(['enableLinkTracking']);

    // Heart beat timer for accurate time-on-page
    if (settings?.enableHeartBeatTimer)
      paq(['enableHeartBeatTimer', settings.enableHeartBeatTimer]);

    // Settings-level custom dimensions (visit-scope, set once at init)
    if (settings?.customDimensions) {
      for (const [id, value] of Object.entries(settings.customDimensions)) {
        paq(['setCustomDimension', Number(id), value]);
      }
    }
  },

  async push(event, { rule = {}, data, env, collector }) {
    const { window } = getEnv(env);
    const w = window as Window;
    const paq = w._paq!.push.bind(w._paq!);
    const eventMapping: Mapping = rule.settings || {};

    // Default page view (no mapping settings)
    if (event.name === 'page view' && !rule.settings) {
      paq([
        'trackPageView',
        await getMappingValue(event, 'data.title', { collector }),
      ]);
      return;
    }

    const parameters = isArray(data) ? data : [data];

    // Site search
    if (eventMapping.siteSearch) {
      paq(['trackSiteSearch', ...parameters]);
      return;
    }

    // Content impression
    if (eventMapping.contentImpression) {
      paq(['trackContentImpression', ...parameters]);
      return;
    }

    // Content interaction
    if (eventMapping.contentInteraction) {
      paq(['trackContentInteraction', ...parameters]);
      return;
    }

    // Per-event custom dimensions (action-scope)
    if (eventMapping.customDimensions) {
      for (const [id, path] of Object.entries(eventMapping.customDimensions)) {
        const value = await getMappingValue(event, path, { collector });
        if (value !== undefined) {
          paq(['setCustomDimension', Number(id), value]);
        }
      }
    }

    // Default: pass through with mapped name and data
    paq([event.name, ...parameters]);

    // Goal tracking alongside event
    if (eventMapping.goalId) {
      const goalValue = eventMapping.goalValue
        ? await getMappingValue(event, eventMapping.goalValue, { collector })
        : undefined;
      paq(['trackGoal', eventMapping.goalId, goalValue]);
    }
  },
};

function addScript(url: string, env?: DestinationWeb.Env) {
  const { document } = getEnv(env);
  const doc = document as Document;
  const script = doc.createElement('script');
  script.type = 'text/javascript';
  script.src = url + 'matomo.js';
  script.async = true;
  script.defer = true;
  doc.head.appendChild(script);
}

export default destinationMatomo;
