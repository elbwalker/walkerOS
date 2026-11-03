import type { Logger, WalkerOS } from '@walkeros/core';
import {
  getGrantedConsent,
  getMappingValue,
  isObject,
  isString,
  StepError,
  stepCall,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
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

const TTQ_METHODS = [
  'load',
  'track',
  'identify',
  'enableCookie',
  'disableCookie',
];

/** A loaded Pixel (or a test mock), not the queue `setup()` installs. */
function isTTQ(value: unknown): value is TTQ {
  return (
    typeof value === 'function' &&
    TTQ_METHODS.every((key) => typeof Reflect.get(value, key) === 'function')
  );
}

// Types export
export * as DestinationTikTok from './types';

/**
 * Read the TikTok `ttq` function off env.window. getEnv() transparently
 * falls through to the global window when env is undefined (production),
 * or uses env.window when the caller provides a mock (tests).
 */
function getTTQ(env?: DestinationWeb.Env): TTQ {
  const { ttq } = getEnv(env).window;
  if (!isTTQ(ttq))
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
  env?: DestinationWeb.Env,
) {
  return loadVendor(
    config.loadScript !== false ? SCRIPT_SRC : undefined,
    () => getEnv(env).window.ttq,
    { timeout: config.timeout, document: getEnv(env).document },
  );
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
): Promise<NonNullable<RuntimeState['lastIdentity']> | undefined> {
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

  // No non-empty value resolved: nothing to identify. An identity that is
  // already current skips ttq.identify() as well.
  if (Object.keys(params).length === 0) return undefined;
  if (!changed) return next;

  await stepCall(
    () => ttq.identify(params),
    'transport',
    'TikTok identify failed',
  );
  return next;
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
  logger.debug(`TikTok skipped ${call}: ${key} resolved to nothing`, {
    event: event.name,
  });
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

    // The destination calls no ttq.page().
    const loadOptions: Record<string, unknown> = { ...passthrough };

    await stepCall(
      () => ttq.load(apiKey, loadOptions),
      'vendor-not-ready',
      'TikTok load call failed',
    );

    // Initialize runtime state. Identity is resolved on first push.
    const _state: RuntimeState = { lastIdentity: {} };
    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, data, env, collector, logger }) {
    vendor(config, env).check();
    const ttq = getTTQ(env);
    const settings: Partial<Settings> = config.settings || {};
    const mappingSettings: Mapping = rule?.settings || {};

    const state: RuntimeState = settings._state || {};

    // Identity - rule-level override wins over destination-level.
    // Resolved and diffed against runtime state; only changes fire
    // ttq.identify(). Order: identify BEFORE track so Advanced Matching
    // is set for the conversion event.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      const identity = isObject(resolved)
        ? await applyIdentify(ttq, resolved, state.lastIdentity)
        : undefined;
      if (identity) state.lastIdentity = identity;
      else skipped(logger, event, 'identify', 'identify');
    }

    // Default track. rule.silent suppresses the call entirely (e.g., for
    // rules that are identify-only).
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const params: Record<string, unknown> = isObject(data) ? data : {};

      await stepCall(
        () => ttq.track(eventName, params, { event_id: event.id }),
        'transport',
        'TikTok track failed',
      );
    }

    // A silent rule whose identify resolves nothing (or an identity that is
    // already current) sends nothing: a declared skip, not a failure.
    // Persist runtime state mutations. walkerOS destinations are
    // long-lived singletons so mutating settings in place is safe and
    // matches the Snowplow precedent.
    settings._state = state;
  },

  // The destination's required consent decides on the whole consent state,
  // as it gates the pushes, and only a change that names a required key
  // reaches TikTok: a revocation disables its cookies, a grant enables them.
  async on(type, { config, data, env, collector }) {
    const required = config.consent;
    if (type !== 'consent' || !required || !isObject(data)) return;
    if (!Object.keys(required).some((key) => key in data)) return;

    const ttq = getTTQ(env);
    const granted = getGrantedConsent(required, collector.consent) !== false;
    await stepCall(
      () => (granted ? ttq.enableCookie() : ttq.disableCookie()),
      'consent-not-applied',
      'TikTok did not take the consent update',
    );
  },
};

export default destinationTikTok;
