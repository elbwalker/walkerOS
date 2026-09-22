import type { Mapping, Destination, Env } from './types';
import { getMappingValue, isArray } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import type { DimensionValues } from './dimensions';
import type { MethodName } from './methods';
import {
  resolveDimensionMap,
  sequence,
  toDimensionsArgument,
} from './dimensions';
import { isIdentified, transition } from './identified';
import { DIMENSIONS_ARG, isMethodName } from './methods';
import { logSkip } from './skip';

// Types
export * as DestinationPiwikPro from './types';

// Trackers that already got enableLinkTracking, keyed like the identified
// state by the collector that drives them. Neither `_paq` nor the env window
// is a stable identity: the loaded tracker replaces the `_paq` array with its
// own command object, and trace-level observation hands each push a freshly
// wrapped env.
const linkTracked = new WeakSet<object>();

export const destinationPiwikPro: Destination = {
  type: 'piwikpro',

  config: {},

  init({ config, env, logger, collector }) {
    const { window } = getEnv<Env>(env);
    const { settings = {}, loadScript } = config;
    const { appId, url } = settings;

    // Set up the Piwik Pro interface _paq
    window._paq = window._paq || [];
    const queue = window._paq;
    const paq = (command: unknown[]) => {
      queue.push(command);
    };

    if (loadScript) {
      // Required only to load and address the tracker
      if (!appId) return logger.throw('Config settings appId missing');
      if (!url) return logger.throw('Config settings url missing');

      const baseUrl = normalizeUrl(url);

      // Load the JavaScript Tracking Client
      addScript(baseUrl, env);

      // Register the tracker url only with script loading
      paq(['setTrackerUrl', baseUrl + 'ppms.php']);

      // Register app id
      paq(['setSiteId', appId]);
    }

    // Start anonymous, before the tracker loads, unless identification is
    // granted already; a consent object resolves per event from then on.
    if (!isIdentified(settings.identified, collector))
      transition(collector, false).forEach(paq);
  },

  async push(event, { config, rule = {}, data, env, collector, logger, id }) {
    const { window } = getEnv<Env>(env);
    const queue = window._paq;
    if (!queue) {
      logger.warn('Piwik PRO _paq queue missing, init() not run');
      return;
    }
    const paq = (command: unknown[]) => {
      queue.push(command);
    };

    const settings = config.settings || {};
    const linkTracking = settings.linkTracking !== false;

    // A tracking hit; the first one is followed by enableLinkTracking, as in
    // Piwik PRO's own snippet.
    const hit = (command: unknown[]) => {
      paq(command);
      if (linkTracking && !linkTracked.has(collector)) {
        linkTracked.add(collector);
        paq(['enableLinkTracking']);
      }
    };

    // An explicit rule name (already applied to event.name) passes through,
    // so state setters stay usable. Only the implicit case can be unmapped.
    let method: string;
    if (rule.name) method = event.name;
    else if (event.name === 'page view') method = 'trackPageView';
    else {
      logSkip(
        logger,
        `${id}|${event.name}|unmapped`,
        `Event "${event.name}" skipped: no rule name and not a page view`,
        { event: event.name, reason: 'unmapped' },
      );
      return;
    }

    const mapping: Mapping = rule.settings || {};
    const { goalId } = mapping;
    const sendsHit = rule.silent !== true;
    const portable = isMethodName(method) ? method : undefined;

    if (!sendsHit && goalId === undefined) {
      logSkip(
        logger,
        `${id}|${event.name}|silent`,
        `Event "${event.name}" skipped: silent rule without a goal`,
        { event: event.name, reason: 'silent' },
      );
      return;
    }

    // Resolve everything first, so this event's commands are pushed in one
    // synchronous block below and never interleave with another event's.
    const args =
      !rule.name && rule.data === undefined
        ? [await getMappingValue(event, 'data.title', { collector })]
        : toArgs(data);

    // Only a portable method hit or the goal carries dimensions.
    const withAnyDimensions =
      goalId !== undefined || (sendsHit && portable !== undefined);
    const destinationDimensions = withAnyDimensions
      ? await resolveDimensionMap(settings.customDimensions, event, collector)
      : {};
    const ruleDimensions = withAnyDimensions
      ? await resolveDimensionMap(mapping.customDimensions, event, collector)
      : {};

    const goalValue =
      goalId === undefined || mapping.goalValue === undefined
        ? undefined
        : await getMappingValue(event, mapping.goalValue, { collector });

    // Match the tracker's identified state before anything else is pushed
    transition(
      collector,
      isIdentified(settings.identified, collector, event),
    ).forEach(paq);

    if (sendsHit) {
      if (portable === undefined) {
        // Any other command sets state: not a hit, no dimensions.
        paq([method, ...trimTrailing(args)]);
      } else if (DIMENSIONS_ARG[portable] === undefined) {
        // No dimensions argument: set the dimensions around the hit.
        const { before, after } = sequence(
          destinationDimensions,
          ruleDimensions,
        );
        before.forEach(paq);
        hit([portable, ...trimTrailing(args)]);
        after.forEach(paq);
      } else {
        hit([
          portable,
          ...trimTrailing(
            withDimensions(
              portable,
              args,
              destinationDimensions,
              ruleDimensions,
            ),
          ),
        ]);
      }
    }

    if (goalId !== undefined) {
      hit([
        'trackGoal',
        ...trimTrailing(
          withDimensions(
            'trackGoal',
            [goalId, goalValue],
            destinationDimensions,
            ruleDimensions,
          ),
        ),
      ]);
    }
  },
};

/** Base URL with exactly one trailing slash. */
function normalizeUrl(url: string): string {
  return `${url.replace(/\/+$/, '')}/`;
}

function toArgs(data: unknown): unknown[] {
  if (data === undefined) return [];
  return isArray(data) ? [...data] : [data];
}

/**
 * Places the filtered dimensions argument of a method that has one, padding
 * the arguments before it with undefined. When nothing is left, a
 * mapping-provided argument is cleared, so the tracker never gets it raw.
 */
function withDimensions(
  method: MethodName,
  args: unknown[],
  destination: DimensionValues,
  rule: DimensionValues,
): unknown[] {
  const index = DIMENSIONS_ARG[method];
  if (index === undefined) return args;

  const dimensions = toDimensionsArgument(destination, rule, args[index]);
  const empty = Object.keys(dimensions).length === 0;
  if (empty && index >= args.length) return args;

  // Always the filtered object; an empty one clears a mapping-provided slot.
  const placed = [...args];
  while (placed.length < index) placed.push(undefined);
  placed[index] = empty ? undefined : dimensions;
  return placed;
}

function trimTrailing(args: unknown[]): unknown[] {
  let end = args.length;
  while (end > 0 && args[end - 1] === undefined) end--;
  return args.slice(0, end);
}

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
