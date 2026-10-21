import type { WalkerOS } from '@walkeros/core';
import { getMappingValue, isObject, isString, StepError } from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';
import { SCRIPT_SRC, setup } from './setup';
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
  const { ttq } = window as unknown as { ttq?: TTQ };
  if (!ttq)
    throw new StepError('TikTok Pixel not ready: window.ttq is missing', {
      code: 'vendor-not-ready',
    });
  return ttq;
}

/**
 * The Pixel script `loadVendor` injects unless `loadScript` is false. ttq
 * replays its own queue, so it is called synchronously and only a failed
 * script is reported.
 */
function vendor(
  config: { loadScript?: boolean; timeout?: number },
  env: unknown,
) {
  return loadVendor(
    config.loadScript !== false ? SCRIPT_SRC : undefined,
    () => {
      const { window } = getEnv(env as Parameters<typeof getEnv>[0]);
      return (window as unknown as { ttq?: TTQ }).ttq;
    },
    { timeout: config.timeout },
  );
}

/** Runs one ttq call; a throw or a rejection becomes a StepError of `code`. */
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
 * Resolve an identify mapping value and, if any Advanced Matching
 * parameter changed since last push, call ttq.identify() with the full
 * resolved object. Returns the updated lastIdentity snapshot.
 *
 * The destination never partial-updates identity - TikTok treats each
 * ttq.identify() call as a full replacement of Advanced Matching state.
 */
async function applyIdentify(
  ttq: TTQ,
  resolved: Record<string, unknown>,
  lastIdentity: NonNullable<RuntimeState['lastIdentity']> = {},
): Promise<{
  lastIdentity: NonNullable<RuntimeState['lastIdentity']>;
  resolved: boolean;
}> {
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
  if (!changed || Object.keys(params).length === 0)
    return { lastIdentity: next, resolved: Object.keys(params).length > 0 };

  await call(() => ttq.identify(params), 'transport', 'TikTok identify failed');
  return { lastIdentity: next, resolved: true };
}

export const destinationTikTok: Destination = {
  type: 'tiktok',

  config: {},

  async init({ config, env }) {
    // A copy, so the destructure below does not read keys off the live settings
    const settings = { ...config.settings };
    if (!settings.apiKey)
      throw new StepError('TikTok needs settings.apiKey', { code: 'config' });

    // Ensure window.ttq exists (queue-based stub) before any call.
    setup(env);

    // Load the real TikTok Pixel SDK from the CDN. The queue replays
    // once the script executes.
    vendor(config, env);

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

    await call(
      () => ttq.load(apiKey, loadOptions),
      'vendor-not-ready',
      'TikTok load call failed',
    );

    // Initialize runtime state. Identity is resolved on first push.
    const _state: RuntimeState = { lastIdentity: {} };
    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, data, env, collector }) {
    vendor(config, env).check();
    const ttq = getTTQ(env);
    const settings = (config.settings || {}) as Settings;
    const mappingSettings = (rule?.settings || {}) as Mapping;

    const state: RuntimeState = settings._state || {};
    // Whether any ttq call or identity came out of this event
    let sent = false;

    // Identity - rule-level override wins over destination-level.
    // Resolved and diffed against runtime state; only changes fire
    // ttq.identify(). Order: identify BEFORE track so Advanced Matching
    // is set for the conversion event.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      if (isObject(resolved)) {
        const identity = await applyIdentify(
          ttq,
          resolved as Record<string, unknown>,
          state.lastIdentity,
        );
        state.lastIdentity = identity.lastIdentity;
        sent = identity.resolved;
      }
    }

    // Default track. rule.silent suppresses the call entirely (e.g., for
    // rules that are identify-only).
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const params: Record<string, unknown> = isObject(data)
        ? (data as Record<string, unknown>)
        : {};

      await call(
        () => ttq.track(eventName, params, { event_id: event.id }),
        'transport',
        'TikTok track failed',
      );
      sent = true;
    }

    // A silent rule that resolved no identity sent nothing at all
    if (!sent && rule?.silent === true && identifyMapping !== undefined)
      throw new StepError(
        'TikTok identify resolved to nothing for this event',
        {
          code: 'missing-input',
        },
      );

    // Persist runtime state mutations. walkerOS destinations are
    // long-lived singletons so mutating settings in place is safe and
    // matches the Snowplow precedent.
    settings._state = state;
  },

  async on(type, context) {
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

    await call(
      () => (allGranted ? ttq.enableCookie() : ttq.disableCookie()),
      'consent-not-applied',
      'TikTok did not take the consent update',
    );
  },
};

export default destinationTikTok;
