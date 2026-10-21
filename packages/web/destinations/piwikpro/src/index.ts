import type { Mapping, Destination, Env } from './types';
import {
  getGrantedConsent,
  getMappingValue,
  isArray,
  isObject,
  StepError,
  stepCall,
} from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';
import type { DimensionValues } from './dimensions';
import type { MethodName } from './methods';
import {
  resolveDimensionMap,
  sequence,
  toDimensionsArgument,
} from './dimensions';
import { isIdentified, transition } from './identified';
import { DIMENSIONS_ARG, isMethodName } from './methods';

// Types
export * as DestinationPiwikPro from './types';

// Trackers that already got enableLinkTracking, keyed like the identified
// state by the collector that drives them. Neither `_paq` nor the env window
// is a stable identity: the loaded tracker replaces the `_paq` array with its
// own command object, and trace-level observation hands each push a freshly
// wrapped env.
const linkTracked = new WeakSet<object>();

/**
 * Pushes commands onto the queue in one synchronous block, so another
 * event's commands never interleave, then waits for what each push returns.
 */
function pushAll(
  queue: unknown[],
  commands: unknown[][],
  code: string,
  message: string,
): Promise<number[]> {
  return stepCall(
    () => Promise.all(commands.map((command) => queue.push(command))),
    code,
    message,
  );
}

/**
 * ppms.js, injected by `loadVendor` with `loadScript`. `_paq` replays its own
 * queue, so commands are pushed synchronously and only a failed script is
 * reported.
 */
function vendor(url: string | undefined, env?: Env, timeout?: number) {
  return loadVendor(
    url ? `${normalizeUrl(url)}ppms.js` : undefined,
    () => getEnv<Env>(env).window._paq,
    { timeout },
  );
}

export const destinationPiwikPro: Destination = {
  type: 'piwikpro',

  config: {},

  async init({ config, env, collector }) {
    const { window } = getEnv<Env>(env);
    const { settings = {}, loadScript } = config;
    const { appId, url } = settings;
    const commands: unknown[][] = [];

    if (loadScript) {
      // Required only to load and address the tracker
      if (!appId || !url)
        throw new StepError(
          `Piwik PRO with loadScript needs settings ${[
            ...(appId ? [] : ['appId']),
            ...(url ? [] : ['url']),
          ].join(' and ')}`,
          { code: 'config' },
        );

      const baseUrl = normalizeUrl(url);

      // Register the tracker url only with script loading
      commands.push(['setTrackerUrl', baseUrl + 'ppms.php']);

      // Register app id
      commands.push(['setSiteId', appId]);
    }

    // Start anonymous, before the tracker loads, unless identification is
    // granted already; a consent object resolves per event from then on.
    if (!isIdentified(settings.identified, collector))
      commands.push(...transition(collector, false));

    // Set up the Piwik Pro interface _paq and load the tracking client
    window._paq = window._paq || [];
    if (loadScript) vendor(url, env, config.timeout);
    await pushAll(
      window._paq,
      commands,
      'vendor-not-ready',
      'Piwik PRO did not take its setup commands',
    );
  },

  async push(event, { config, rule = {}, data, env, collector }) {
    const settings = config.settings || {};
    if (config.loadScript) vendor(settings.url, env, config.timeout).check();
    const queue = getEnv<Env>(env).window._paq;
    if (!queue)
      throw new StepError('Piwik PRO _paq queue missing: init did not run', {
        code: 'vendor-not-ready',
      });

    // This event's commands, pushed in one block at the end.
    const commands: unknown[][] = [];
    const paq = (command: unknown[]) => {
      commands.push(command);
    };

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

    const mapping: Mapping = rule.settings || {};
    const { goalId } = mapping;

    // An explicit rule name (already applied to event.name) passes through,
    // so state setters stay usable. The implicit case is a page view, or
    // with a goal only the goal, else unmapped.
    const implicitPageView = !rule.name && event.name === 'page view';
    const method = rule.name
      ? event.name
      : implicitPageView
        ? 'trackPageView'
        : undefined;
    if (method === undefined && goalId === undefined)
      throw new StepError(
        `Piwik PRO has no method for "${event.name}": map it with a rule name or a goal, or ignore it`,
        { code: 'missing-input' },
      );

    // The method hit, unless silent or goal-only
    const hitMethod = rule.silent === true ? undefined : method;
    const portable =
      hitMethod !== undefined && isMethodName(hitMethod)
        ? hitMethod
        : undefined;

    // A silent rule without a goal sends nothing, no transition either.
    const sends = hitMethod !== undefined || goalId !== undefined;

    // Resolve everything first, so this event's commands are pushed in one
    // synchronous block below and never interleave with another event's.
    const args =
      hitMethod === undefined
        ? []
        : implicitPageView && rule.data === undefined
          ? [await getMappingValue(event, 'data.title', { collector })]
          : toArgs(data);

    // Only a portable method hit or the goal carries dimensions.
    const withAnyDimensions = goalId !== undefined || portable !== undefined;
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
    if (sends)
      transition(
        collector,
        isIdentified(settings.identified, collector, event),
      ).forEach(paq);

    if (hitMethod !== undefined) {
      if (portable === undefined) {
        // Any other command sets state: not a hit, no dimensions.
        paq([hitMethod, ...trimTrailing(args)]);
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

    if (commands.length)
      await pushAll(
        queue,
        commands,
        'transport',
        'Piwik PRO did not take the event commands',
      );
  },

  // The destination's required consent decides, as it gates the pushes: a
  // revocation turns off the link tracking the destination enabled, which
  // keeps sending on its own; the next hit after a grant turns it on again.
  async on(type, { config, data, env, collector }) {
    const required = config.consent;
    if (type !== 'consent' || !required || !isObject(data)) return;
    if (!Object.keys(required).some((key) => key in data)) return;
    if (getGrantedConsent(required, collector.consent) !== false) return;
    const queue = getEnv(env).window._paq;
    if (!queue) return;

    linkTracked.delete(collector);
    await pushAll(
      queue,
      [['disableLinkTracking']],
      'consent-not-applied',
      'Piwik PRO did not take the consent update',
    );
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

export default destinationPiwikPro;
