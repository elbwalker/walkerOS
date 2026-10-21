import type { Mapping, Destination, Env } from './types';
import {
  getGrantedConsent,
  getMappingValue,
  isArray,
  isObject,
  reportCause,
  stepId,
  StepError,
} from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';
import { resolveDimensionMap, sequence } from './dimensions';

// Types
export * as DestinationMatomo from './types';

/**
 * Pushes commands onto the queue in one synchronous block, so another
 * event's commands never interleave, then waits for what each push returns.
 */
async function pushAll(
  queue: unknown[],
  commands: unknown[][],
  code: string,
  message: string,
): Promise<void> {
  try {
    await Promise.all(commands.map((command) => queue.push(command)));
  } catch (error) {
    throw new StepError(message, { code, cause: error });
  }
}

/**
 * matomo.js, injected by `loadVendor` with `loadScript`. `_paq` replays its
 * own queue, so commands are pushed synchronously and only a failed script
 * is reported.
 */
function vendor(url: string | undefined, env?: Env, timeout?: number) {
  return loadVendor(
    url ? `${normalizeUrl(url)}matomo.js` : undefined,
    () => getEnv<Env>(env).window._paq,
    { timeout },
  );
}

export const destinationMatomo: Destination = {
  type: 'matomo',

  config: {},

  async init({ config, env }) {
    const { window } = getEnv<Env>(env);
    const { settings = {}, loadScript } = config;
    const { siteId, url } = settings;
    const commands: unknown[][] = [];

    if (loadScript) {
      // Required only to load and address the tracker
      if (!siteId || !url)
        throw new StepError(
          `Matomo with loadScript needs settings ${[
            ...(siteId ? [] : ['siteId']),
            ...(url ? [] : ['url']),
          ].join(' and ')}`,
          { code: 'config' },
        );

      const baseUrl = normalizeUrl(url);
      commands.push(['setTrackerUrl', baseUrl + 'matomo.php']);
      commands.push(['setSiteId', siteId]);
    }

    // Cookie-free tracking
    if (settings.disableCookies) commands.push(['disableCookies']);

    // Enable link tracking by default
    if (settings.enableLinkTracking !== false)
      commands.push(['enableLinkTracking']);

    // Heart beat timer for accurate time-on-page
    if (settings.enableHeartBeatTimer)
      commands.push(['enableHeartBeatTimer', settings.enableHeartBeatTimer]);

    // The Matomo command queue
    window._paq = window._paq || [];
    if (loadScript) vendor(url, env, config.timeout);
    await pushAll(
      window._paq,
      commands,
      'vendor-not-ready',
      'Matomo did not take its setup commands',
    );
  },

  async push(event, { config, rule = {}, data, env, collector, logger, id }) {
    const settings = config.settings || {};
    if (config.loadScript) vendor(settings.url, env, config.timeout).check();
    const queue = getEnv<Env>(env).window._paq;
    if (!queue)
      throw new StepError('Matomo _paq queue missing: init did not run', {
        code: 'vendor-not-ready',
      });

    const eventMapping: Mapping = rule.settings || {};
    const { goalId } = eventMapping;
    const parameters = isArray(data) ? data : [data];

    // Matomo drops a conversion whose goal id is not a positive integer: the
    // hit goes without it, and the cause log reports it once per cause.
    const goal = goalId === undefined || isGoalId(goalId) ? goalId : undefined;
    if (goalId !== undefined && goal === undefined)
      reportCause(
        collector,
        logger,
        { step: stepId('destination', id), code: 'config' },
        'Matomo goal skipped: goalId is not a positive integer',
        { event: event.name, mappingKey: 'goalId' },
      );

    // A tracking flag picks the method, an explicit rule name (already
    // applied to event.name) passes through, and a page view defaults to
    // trackPageView. A silent rule sends none of them, only its goal.
    let command: unknown[] | undefined;
    if (rule.silent) {
      command = undefined;
    } else if (eventMapping.siteSearch) {
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
      throw new StepError(
        `Matomo has no command for "${event.name}": map it with a rule name, a tracking flag or a goal, or ignore it`,
        { code: 'missing-input' },
      );
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

    // A silent rule without a goal sends nothing, dimensions included.
    if (command || goal !== undefined)
      await pushAll(
        queue,
        [
          ...before,
          ...(command ? [command] : []),
          // Goal tracking alongside event
          ...(goal !== undefined ? [['trackGoal', goal, goalValue]] : []),
          ...after,
        ],
        'transport',
        'Matomo did not take the event commands',
      );
  },

  // The destination's required consent decides, as it gates the pushes: a
  // revocation stops every tracking request (link tracking included) for the
  // page, a grant resumes them. With disableCookies the grant keeps cookies
  // off.
  async on(type, { config, data, env, collector }) {
    const required = config.consent;
    if (type !== 'consent' || !required || !isObject(data)) return;
    if (!Object.keys(required).some((key) => key in data)) return;
    const queue = getEnv(env).window._paq;
    if (!queue) return;

    const granted = getGrantedConsent(required, collector.consent) !== false;
    const disableCookies =
      isObject(config.settings) && config.settings.disableCookies === true;
    const command = !granted
      ? ['forgetConsentGiven']
      : disableCookies
        ? ['setConsentGiven', false]
        : ['setConsentGiven'];

    await pushAll(
      queue,
      [command],
      'consent-not-applied',
      'Matomo did not take the consent update',
    );
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

export default destinationMatomo;
