import type { WalkerOS } from '@walkeros/core';
import { getMappingValue, isObject, isString } from '@walkeros/core';
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
function applyIdentity(
  posthog: PostHogSDK,
  resolved: Record<string, unknown>,
  lastIdentity: RuntimeState['lastIdentity'] = {},
): NonNullable<RuntimeState['lastIdentity']> {
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
      posthog.identify(distinctId, $set, $setOnce);
      updated.distinctId = distinctId;
    }
  } else if ($set || $setOnce) {
    posthog.setPersonProperties($set, $setOnce);
  }

  return updated;
}

/**
 * Resolve the group mapping value, call posthog.group(type, key, properties?).
 * Like identity, group changes are tracked in runtime state and only re-fired
 * when type or key changes.
 */
function applyGroup(
  posthog: PostHogSDK,
  resolved: Record<string, unknown>,
  lastGroup: RuntimeState['lastGroup'] = {},
): NonNullable<RuntimeState['lastGroup']> {
  const updated = { ...lastGroup };
  const type = resolved.type;
  const key = resolved.key;
  const properties = isObject(resolved.properties)
    ? (resolved.properties as Record<string, unknown>)
    : undefined;

  if (isString(type) && isString(key)) {
    if (type !== lastGroup.type || key !== lastGroup.key || properties) {
      posthog.group(type, key, properties);
      updated.type = type;
      updated.key = key;
    }
  }

  return updated;
}

export const destinationPostHog: Destination = {
  type: 'posthog',

  config: {},

  async init({ config, env }) {
    const settings = config.settings;
    if (!settings?.apiKey) return false;

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
    posthog.init(apiKey, {
      ...options,
      loaded: () => {
        loadedFired = true;
      },
    });
    if (!loadedFired) {
      await Promise.resolve();
    }

    const _state: RuntimeState = { lastIdentity: {}, lastGroup: {} };
    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, env, data, collector }) {
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
        posthog.reset();
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
      if (isObject(resolved)) {
        state.lastIdentity = applyIdentity(
          posthog,
          resolved as Record<string, unknown>,
          state.lastIdentity,
        );
      }
    }

    // 3. Group - rule-level override wins over destination-level.
    const groupMapping = mappingSettings.group ?? settings.group;
    if (groupMapping !== undefined) {
      const resolved = await getMappingValue(event, groupMapping, {
        collector,
      });
      if (isObject(resolved)) {
        state.lastGroup = applyGroup(
          posthog,
          resolved as Record<string, unknown>,
          state.lastGroup,
        );
      }
    }

    // 4. Default capture - unless rule opts out via silent.
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = isObject(data)
        ? (data as Record<string, unknown>)
        : {};
      posthog.capture(eventName, properties);
    }

    // Persist state. walkerOS destinations are long-lived singletons so
    // mutating settings in place is safe (Snowplow precedent).
    settings._state = state;
  },

  on(type, context) {
    if (type !== 'consent' || !context?.data) return;
    const posthog = getPostHog(context.env as Env | undefined);

    const consent = context.data as WalkerOS.Consent;
    // Derive required consent keys from config.consent. If all declared
    // keys are granted, opt IN; otherwise opt OUT. Missing config.consent
    // means nothing to check and we take no action.
    const required = (context.config as { consent?: WalkerOS.Consent })
      ?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );
    if (allGranted) {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
  },
};

export default destinationPostHog;
