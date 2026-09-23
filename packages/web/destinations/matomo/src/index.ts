import type { Mapping, Destination, Env } from './types';
import { getMappingValue, isArray } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import { resolveDimensionMap, sequence } from './dimensions';
import { logSkip } from './skip';

// Types
export * as DestinationMatomo from './types';

export const destinationMatomo: Destination = {
  type: 'matomo',

  config: {},

  init({ config, env, logger }) {
    const { window } = getEnv<Env>(env);
    const { settings = {}, loadScript } = config;
    const { siteId, url } = settings;

    // Set up the Matomo command queue
    window._paq = window._paq || [];
    const queue = window._paq;
    const paq = (command: unknown[]) => {
      queue.push(command);
    };

    if (loadScript) {
      // Required only to load and address the tracker
      if (!siteId) return logger.throw('Config settings siteId missing');
      if (!url) return logger.throw('Config settings url missing');

      const baseUrl = normalizeUrl(url);

      // Load the Matomo tracking script
      addScript(baseUrl, env);

      // Configure tracker URL and site ID
      paq(['setTrackerUrl', baseUrl + 'matomo.php']);
      paq(['setSiteId', siteId]);
    }

    // Cookie-free tracking
    if (settings.disableCookies) paq(['disableCookies']);

    // Enable link tracking by default
    if (settings.enableLinkTracking !== false) paq(['enableLinkTracking']);

    // Heart beat timer for accurate time-on-page
    if (settings.enableHeartBeatTimer)
      paq(['enableHeartBeatTimer', settings.enableHeartBeatTimer]);
  },

  async push(event, { config, rule = {}, data, env, collector, logger, id }) {
    const { window } = getEnv<Env>(env);
    const queue = window._paq;
    if (!queue) {
      logger.warn('Matomo _paq queue missing, init() not run');
      return;
    }
    const paq = (command: unknown[]) => {
      queue.push(command);
    };

    const settings = config.settings || {};
    const eventMapping: Mapping = rule.settings || {};
    const { goalId } = eventMapping;
    const parameters = isArray(data) ? data : [data];

    // Matomo drops a conversion whose goal id is not a positive integer
    const goal = isGoalId(goalId) ? goalId : undefined;
    if (goalId !== undefined && goal === undefined)
      logSkip(
        logger,
        `${id}|${event.name}|invalid goalId`,
        `Goal of event "${event.name}" skipped: goalId ${JSON.stringify(goalId)} is not a positive integer`,
        { event: event.name, reason: 'invalid goalId' },
      );

    // A tracking flag picks the method, an explicit rule name (already
    // applied to event.name) passes through, and a page view defaults to
    // trackPageView. Anything else sends only its goal, or is unmapped.
    let command: unknown[] | undefined;
    if (eventMapping.siteSearch) {
      command = ['trackSiteSearch', ...parameters];
    } else if (eventMapping.contentImpression) {
      command = ['trackContentImpression', ...parameters];
    } else if (eventMapping.contentInteraction) {
      command = ['trackContentInteraction', ...parameters];
    } else if (rule.name) {
      command = [event.name, ...parameters];
    } else if (event.name === 'page view') {
      // The page title only when the rule maps no data of its own
      command =
        rule.data === undefined
          ? [
              'trackPageView',
              await getMappingValue(event, 'data.title', { collector }),
            ]
          : ['trackPageView', ...parameters];
    } else if (goal === undefined) {
      logSkip(
        logger,
        `${id}|${event.name}|unmapped`,
        `Event "${event.name}" skipped: no rule name, tracking flag or goal, and not a page view`,
        { event: event.name, reason: 'unmapped' },
      );
      return;
    }

    // Resolve everything first, so this event's commands are pushed in one
    // synchronous block below and never interleave with another event's.
    const goalValue =
      goal !== undefined && eventMapping.goalValue !== undefined
        ? await getMappingValue(event, eventMapping.goalValue, { collector })
        : undefined;

    const { before, after } = sequence(
      await resolveDimensionMap(settings.customDimensions, event, collector),
      await resolveDimensionMap(
        eventMapping.customDimensions,
        event,
        collector,
      ),
    );

    before.forEach(paq);
    if (command) paq(command);

    // Goal tracking alongside event
    if (goal !== undefined) paq(['trackGoal', goal, goalValue]);

    after.forEach(paq);
  },
};

// A Matomo goal id, the same rule as the mapping schema.
const GOAL_ID = /^[1-9]\d*$/;

/** A positive integer, as a number or a decimal string. */
function isGoalId(value: unknown): value is string | number {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0;
  return typeof value === 'string' && GOAL_ID.test(value);
}

/** Base URL with exactly one trailing slash. */
function normalizeUrl(url: string): string {
  return `${url.replace(/\/+$/, '')}/`;
}

function addScript(url: string, env?: Env) {
  const { document } = getEnv<Env>(env);
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url + 'matomo.js';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export default destinationMatomo;
