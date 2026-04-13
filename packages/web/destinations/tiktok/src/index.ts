import type { WalkerOS } from '@walkeros/core';
import { getMappingValue, isObject, isString } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import { addScript, setup } from './setup';
import type {
  Destination,
  IdentifyParams,
  Mapping,
  RuntimeState,
  Settings,
  TTQ,
} from './types';

// Types export
export * as DestinationTikTok from './types';

/**
 * Read the TikTok `ttq` function off env.window. getEnv() transparently
 * falls through to the global window when env is undefined (production),
 * or uses env.window when the caller provides a mock (tests).
 */
function getTTQ(env: unknown): TTQ {
  const { window } = getEnv(env as Parameters<typeof getEnv>[0]);
  return (window as unknown as { ttq: TTQ }).ttq;
}

/**
 * Resolve an identify mapping value and, if any Advanced Matching
 * parameter changed since last push, call ttq.identify() with the full
 * resolved object. Returns the updated lastIdentity snapshot.
 *
 * The destination never partial-updates identity — TikTok treats each
 * ttq.identify() call as a full replacement of Advanced Matching state.
 */
function applyIdentify(
  ttq: TTQ,
  resolved: Record<string, unknown>,
  lastIdentity: NonNullable<RuntimeState['lastIdentity']> = {},
): NonNullable<RuntimeState['lastIdentity']> {
  const next: NonNullable<RuntimeState['lastIdentity']> = { ...lastIdentity };
  const params: IdentifyParams = {};
  let changed = false;

  for (const key of ['email', 'phone_number', 'external_id'] as const) {
    const raw = resolved[key];
    if (!isString(raw) || raw === '') continue;
    params[key] = raw;
    if (next[key] !== raw) {
      next[key] = raw;
      changed = true;
    }
  }

  // Skip ttq.identify() entirely if the resolved object has no non-empty
  // values (anonymous visitor) or if nothing changed.
  if (!changed || Object.keys(params).length === 0) return next;

  ttq.identify(params);
  return next;
}

export const destinationTikTok: Destination = {
  type: 'tiktok',

  config: {},

  init({ config, env }) {
    const settings = config.settings;
    if (!settings?.apiKey) return false;

    // Ensure window.ttq exists (queue-based stub) before any call.
    setup(env);

    // Load the real TikTok Pixel SDK from the CDN. The queue replays
    // once the script executes.
    if (config.loadScript !== false) addScript(env);

    const ttq = getTTQ(env);

    // Build ttq.load() second-arg config by stripping walkerOS-specific
    // keys and forwarding the rest as TikTok passthrough options.
    const {
      apiKey,
      identify: _identify,
      _state: _existingState,
      ...passthrough
    } = settings;

    // TikTok's SDK auto-fires ttq.page() on load; we let it fire (no knob).
    const loadOptions: Record<string, unknown> = { ...passthrough };

    ttq.load(apiKey, loadOptions);

    // Initialize runtime state. Identity is resolved on first push.
    const _state: RuntimeState = { lastIdentity: {} };
    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, data, env }) {
    const ttq = getTTQ(env);
    const settings = (config.settings || {}) as Settings;
    const mappingSettings = (rule?.settings || {}) as Mapping;

    const state: RuntimeState = settings._state || {};

    // Identity — rule-level override wins over destination-level.
    // Resolved and diffed against runtime state; only changes fire
    // ttq.identify(). Order: identify BEFORE track so Advanced Matching
    // is set for the conversion event.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping);
      if (isObject(resolved)) {
        state.lastIdentity = applyIdentify(
          ttq,
          resolved as Record<string, unknown>,
          state.lastIdentity,
        );
      }
    }

    // Default track. rule.skip suppresses the call entirely (e.g., for
    // rules that are identify-only).
    if (rule?.skip !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const params: Record<string, unknown> = isObject(data)
        ? (data as Record<string, unknown>)
        : {};

      ttq.track(eventName, params, { event_id: event.id });
    }

    // Persist runtime state mutations. walkerOS destinations are
    // long-lived singletons so mutating settings in place is safe and
    // matches the Snowplow precedent.
    settings._state = state;
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;
    const ttq = getTTQ(context.env);

    const consent = context.data as WalkerOS.Consent;
    // Derive the consent key(s) to check from config.consent. TikTok is
    // an advertising tool, so the typical key is "marketing". If ALL
    // required keys are granted, enable cookies; otherwise disable. A
    // missing config.consent means nothing to check and we take no
    // action.
    const required = context.config?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );

    if (allGranted) {
      ttq.enableCookie();
    } else {
      ttq.disableCookie();
    }
  },
};

export default destinationTikTok;
