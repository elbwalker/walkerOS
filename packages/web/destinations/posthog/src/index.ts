import type { Logger, WalkerOS } from '@walkeros/core';
import {
  getGrantedConsent,
  getMappingValue,
  isObject,
  isString,
  StepError,
  stepCall,
} from '@walkeros/core';
import posthogSDK from 'posthog-js';
import type {
  Destination,
  Env,
  PostHogSDK,
  RuntimeState,
  Settings,
} from './types';

// Types export
export * as DestinationPostHog from './types';

/**
 * Resolve the PostHog SDK: use the caller-provided mock when available
 * (tests), otherwise fall back to the real `posthog-js` default export.
 * Matches @walkeros/web-destination-clarity and
 * @walkeros/server-destination-gcp (BigQuery).
 */
function getPostHog(env: Env | undefined): PostHogSDK {
  return env?.posthog ?? (posthogSDK as unknown as PostHogSDK);
}

/**
 * Resolve the identify mapping value, call the right SDK method.
 *
 * - If `distinctId` is present and has changed since last push (or props present):
 *     posthog.identify(distinctId, $set?, $set_once?)
 * - If `distinctId` is absent but $set/$set_once exist:
 *     posthog.setPersonProperties($set, $set_once)
 * - If nothing resolves or distinctId unchanged and no props: no-op
 *
 * Returns the updated lastIdentity snapshot.
 */
async function applyIdentity(
  posthog: PostHogSDK,
  resolved: Record<string, unknown>,
  lastIdentity: RuntimeState['lastIdentity'] = {},
): Promise<{
  lastIdentity: NonNullable<RuntimeState['lastIdentity']>;
  applied: boolean;
}> {
  let applied = false;
  const updated = { ...lastIdentity };

  const distinctId = resolved.distinctId;
  const $set = isObject(resolved.$set)
    ? (resolved.$set as Record<string, unknown>)
    : undefined;
  const $setOnce = isObject(resolved.$set_once)
    ? (resolved.$set_once as Record<string, unknown>)
    : undefined;

  if (isString(distinctId) && distinctId !== '') {
    if (distinctId !== lastIdentity.distinctId || $set || $setOnce) {
      await stepCall(
        () => posthog.identify(distinctId, $set, $setOnce),
        'transport',
        'PostHog identify failed',
      );
      updated.distinctId = distinctId;
    }
    applied = true;
  } else if ($set || $setOnce) {
    await stepCall(
      () => posthog.setPersonProperties($set, $setOnce),
      'transport',
      'PostHog setPersonProperties failed',
    );
    applied = true;
  }

  return { lastIdentity: updated, applied };
}

/**
 * Resolve the group mapping value, call posthog.group(type, key, properties?).
 * Like identity, group changes are tracked in runtime state and only re-fired
 * when type or key changes.
 */
async function applyGroup(
  posthog: PostHogSDK,
  resolved: Record<string, unknown>,
  lastGroup: RuntimeState['lastGroup'] = {},
): Promise<{
  lastGroup: NonNullable<RuntimeState['lastGroup']>;
  applied: boolean;
}> {
  let applied = false;
  const updated = { ...lastGroup };
  const type = resolved.type;
  const key = resolved.key;
  const properties = isObject(resolved.properties)
    ? (resolved.properties as Record<string, unknown>)
    : undefined;

  if (isString(type) && isString(key)) {
    if (type !== lastGroup.type || key !== lastGroup.key || properties) {
      await stepCall(
        () => posthog.group(type, key, properties),
        'transport',
        'PostHog group failed',
      );
      updated.type = type;
      updated.key = key;
    }
    applied = true;
  }

  return { lastGroup: updated, applied };
}

/**
 * A configured mapping that resolved to nothing skips its call: a declared
 * skip, said once at DEBUG with the event and the mapping key, never the
 * value, so a wrong mapping path does not look like an event without data.
 */
function skipped(
  logger: Logger.Instance,
  event: WalkerOS.Event,
  call: string,
  key: string,
): void {
  logger.debug(`PostHog skipped ${call}: ${key} resolved to nothing`, {
    event: event.name,
  });
}

export const destinationPostHog: Destination = {
  type: 'posthog',

  config: {},

  async init({ config, env }) {
    // A copy, so the destructure below does not read keys off the live settings
    const settings = { ...config.settings };
    if (!settings.apiKey)
      throw new StepError('PostHog needs settings.apiKey', { code: 'config' });

    const posthog = getPostHog(env as Env | undefined);

    const {
      apiKey,
      identify: _identify,
      group: _group,
      _state: _existingState,
      ...posthogOptions
    } = settings;

    // walkerOS defaults that override PostHog defaults: walkerOS sources
    // handle event capture, so turn off PostHog's own.
    const options = {
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      ...posthogOptions,
    };

    // posthog.init() is synchronous and returns the singleton. It supports
    // an optional `loaded` callback for post-bootstrap hooks (feature flags
    // fetched, etc). We wait up to one microtask for it to fire so the
    // destination is truly ready before returning; otherwise we resolve
    // immediately so tests with no-op mocks don't hang.
    let loadedFired = false;
    await stepCall(
      () =>
        posthog.init(apiKey, {
          ...options,
          loaded: () => {
            loadedFired = true;
          },
        }),
      'vendor-not-ready',
      'PostHog init failed',
    );
    if (!loadedFired) {
      await Promise.resolve();
    }

    const _state: RuntimeState = { lastIdentity: {}, lastGroup: {} };
    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, env, data, collector, logger }) {
    const posthog = getPostHog(env as Env | undefined);
    const settings = (config.settings || {}) as Settings;
    const mappingSettings = rule?.settings || {};
    const state: RuntimeState = settings._state || {};

    // 1. Reset - fires first so subsequent identity calls start clean.
    if (mappingSettings.reset !== undefined) {
      const resolved =
        typeof mappingSettings.reset === 'boolean'
          ? mappingSettings.reset
          : await getMappingValue(event, mappingSettings.reset, {
              collector,
            });
      if (resolved) {
        await stepCall(
          () => posthog.reset(),
          'transport',
          'PostHog reset failed',
        );
        state.lastIdentity = {};
        state.lastGroup = {};
      }
    }

    // 2. Identity - rule-level override wins over destination-level.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      const identity = isObject(resolved)
        ? await applyIdentity(posthog, resolved, state.lastIdentity)
        : undefined;
      if (identity?.applied) state.lastIdentity = identity.lastIdentity;
      else skipped(logger, event, 'identify', 'identify');
    }

    // 3. Group - rule-level override wins over destination-level.
    const groupMapping = mappingSettings.group ?? settings.group;
    if (groupMapping !== undefined) {
      const resolved = await getMappingValue(event, groupMapping, {
        collector,
      });
      const group = isObject(resolved)
        ? await applyGroup(posthog, resolved, state.lastGroup)
        : undefined;
      if (group?.applied) state.lastGroup = group.lastGroup;
      else skipped(logger, event, 'group', 'group');
    }

    // 4. Default capture - unless rule opts out via silent.
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = isObject(data)
        ? (data as Record<string, unknown>)
        : {};
      await stepCall(
        () => posthog.capture(eventName, properties),
        'transport',
        'PostHog capture failed',
      );
    }

    // A silent rule whose mappings resolve nothing sends nothing: a declared
    // skip, not a failure. Persist state. walkerOS destinations are long-lived singletons so
    // mutating settings in place is safe (Snowplow precedent).
    settings._state = state;
  },

  // The destination's required consent decides on the whole consent state,
  // as it gates the pushes, and only a change that names a required key
  // reaches PostHog: a revocation opts out, a grant opts back in.
  async on(type, { config, data, env, collector }) {
    const required = config.consent;
    if (type !== 'consent' || !required || !isObject(data)) return;
    if (!Object.keys(required).some((key) => key in data)) return;

    const posthog = getPostHog(env as Env | undefined);
    const granted = getGrantedConsent(required, collector.consent) !== false;
    await stepCall(
      () =>
        granted ? posthog.opt_in_capturing() : posthog.opt_out_capturing(),
      'consent-not-applied',
      'PostHog did not take the consent update',
    );
  },
};

export default destinationPostHog;
