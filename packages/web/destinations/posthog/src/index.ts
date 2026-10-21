import type { WalkerOS } from '@walkeros/core';
import { getMappingValue, isObject, isString, StepError } from '@walkeros/core';
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

/** Runs one PostHog call; a throw or a rejection becomes a StepError of `code`. */
async function call(
  fn: () => unknown,
  code: string,
  message: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new StepError(message, { code, cause: error });
  }
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
      await call(
        () => posthog.identify(distinctId, $set, $setOnce),
        'transport',
        'PostHog identify failed',
      );
      updated.distinctId = distinctId;
    }
    applied = true;
  } else if ($set || $setOnce) {
    await call(
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
      await call(
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
    await call(
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

  async push(event, { config, rule, env, data, collector }) {
    const posthog = getPostHog(env as Env | undefined);
    const settings = (config.settings || {}) as Settings;
    const mappingSettings = rule?.settings || {};
    const state: RuntimeState = settings._state || {};
    // Whether any PostHog call or state change came out of this event
    let sent = false;

    // 1. Reset - fires first so subsequent identity calls start clean.
    if (mappingSettings.reset !== undefined) {
      const resolved =
        typeof mappingSettings.reset === 'boolean'
          ? mappingSettings.reset
          : await getMappingValue(event, mappingSettings.reset, {
              collector,
            });
      if (resolved) {
        await call(() => posthog.reset(), 'transport', 'PostHog reset failed');
        state.lastIdentity = {};
        state.lastGroup = {};
        sent = true;
      }
    }

    // 2. Identity - rule-level override wins over destination-level.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      if (isObject(resolved)) {
        const identity = await applyIdentity(
          posthog,
          resolved as Record<string, unknown>,
          state.lastIdentity,
        );
        state.lastIdentity = identity.lastIdentity;
        sent = sent || identity.applied;
      }
    }

    // 3. Group - rule-level override wins over destination-level.
    const groupMapping = mappingSettings.group ?? settings.group;
    if (groupMapping !== undefined) {
      const resolved = await getMappingValue(event, groupMapping, {
        collector,
      });
      if (isObject(resolved)) {
        const group = await applyGroup(
          posthog,
          resolved as Record<string, unknown>,
          state.lastGroup,
        );
        state.lastGroup = group.lastGroup;
        sent = sent || group.applied;
      }
    }

    // 4. Default capture - unless rule opts out via silent.
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = isObject(data)
        ? (data as Record<string, unknown>)
        : {};
      await call(
        () => posthog.capture(eventName, properties),
        'transport',
        'PostHog capture failed',
      );
      sent = true;
    }

    // A silent rule none of whose mappings resolved sent nothing at all
    if (!sent && rule?.silent === true && Object.keys(mappingSettings).length)
      throw new StepError(
        'PostHog mappings resolved to nothing for this event',
        {
          code: 'missing-input',
        },
      );

    // Persist state. walkerOS destinations are long-lived singletons so
    // mutating settings in place is safe (Snowplow precedent).
    settings._state = state;
  },

  async on(type, context) {
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
    await call(
      () =>
        allGranted ? posthog.opt_in_capturing() : posthog.opt_out_capturing(),
      'consent-not-applied',
      'PostHog did not take the consent update',
    );
  },
};

export default destinationPostHog;
