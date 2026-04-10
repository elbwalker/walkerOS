import type { WalkerOS } from '@walkeros/core';
import {
  getMappingValue,
  isArray,
  isDefined,
  isNumber,
  isObject,
  isString,
} from '@walkeros/core';
import * as amplitudeSDK from '@amplitude/analytics-browser';
import { sessionReplayPlugin } from '@amplitude/plugin-session-replay-browser';
import { plugin as engagementPlugin } from '@amplitude/engagement-browser';
import { Experiment } from '@amplitude/experiment-js-client';
import type {
  AmplitudeSDK,
  Destination,
  Env,
  RuntimeState,
  Settings,
} from './types';

// Types export
export * as DestinationAmplitude from './types';

/**
 * Resolve the Amplitude SDK: use the caller-provided mock when available
 * (tests), otherwise fall back to the real @amplitude/analytics-browser
 * namespace. Matches @walkeros/web-destination-clarity and
 * @walkeros/server-destination-gcp (BigQuery).
 */
function getAmplitude(env: Env | undefined): AmplitudeSDK {
  return env?.amplitude ?? (amplitudeSDK as unknown as AmplitudeSDK);
}

/**
 * Deterministic string → positive integer hash (djb2).
 * Same input always produces the same output, so Amplitude's
 * setSessionId receives a stable number for cross-page-load session
 * continuity even when walkerOS sessions are string IDs.
 */
function hashStringToInt(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Compare resolved identity against runtime state, call only the setters
 * that actually changed. Returns the updated state snapshot.
 */
function applyIdentitySetters(
  amp: AmplitudeSDK,
  resolved: Record<string, unknown>,
  lastIdentity: RuntimeState['lastIdentity'] = {},
): NonNullable<RuntimeState['lastIdentity']> {
  const updated = { ...lastIdentity };

  if ('user' in resolved) {
    const user = resolved.user;
    if (user === null || user === '') {
      amp.setUserId(undefined);
      delete updated.user;
    } else if (isString(user) && user !== lastIdentity.user) {
      amp.setUserId(user);
      updated.user = user;
    }
  }

  if ('device' in resolved) {
    const device = resolved.device;
    if (isString(device) && device !== lastIdentity.device) {
      amp.setDeviceId(device);
      updated.device = device;
    }
  }

  if ('session' in resolved) {
    const session = resolved.session;
    // Amplitude requires number (Unix ms or other integer). walkerOS
    // sessions are often strings (e.g. 's3ss10n'). Numeric strings parse
    // directly; non-numeric strings are hashed deterministically via
    // djb2 → same string always produces the same session number,
    // preserving cross-page-load consistency.
    const asNumber = isNumber(session)
      ? session
      : isString(session) && /^\d+$/.test(session)
        ? Number(session)
        : isString(session)
          ? hashStringToInt(session)
          : undefined;
    if (asNumber !== undefined && asNumber !== lastIdentity.session) {
      amp.setSessionId(asNumber);
      updated.session = asNumber;
    }
  }

  return updated;
}

type IdentifyOpKey =
  | 'set'
  | 'setOnce'
  | 'add'
  | 'append'
  | 'prepend'
  | 'preInsert'
  | 'postInsert'
  | 'remove';

const IDENTIFY_OP_KEYS: IdentifyOpKey[] = [
  'set',
  'setOnce',
  'add',
  'append',
  'prepend',
  'preInsert',
  'postInsert',
  'remove',
];

/**
 * Build a chained Identify instance from a resolved object's operation
 * keys. Returns undefined if no operations are present (so the caller
 * can skip amplitude.identify() entirely).
 */
function buildIdentify(
  amp: AmplitudeSDK,
  resolved: Record<string, unknown>,
): InstanceType<AmplitudeSDK['Identify']> | undefined {
  let identify: InstanceType<AmplitudeSDK['Identify']> | undefined;
  const ensure = () => {
    if (!identify) identify = new amp.Identify();
    return identify;
  };

  for (const op of IDENTIFY_OP_KEYS) {
    const bag = resolved[op];
    if (!isObject(bag)) continue;
    for (const [prop, value] of Object.entries(bag)) {
      if (!isDefined(value)) continue;
      if (op === 'add') {
        if (isNumber(value)) ensure().add(prop, value);
      } else {
        ensure()[op](prop, value);
      }
    }
  }

  if (isArray(resolved.unset)) {
    for (const prop of resolved.unset) {
      if (isString(prop)) ensure().unset(prop);
    }
  }

  if (resolved.clearAll === true) {
    ensure().clearAll();
  }

  return identify;
}

type RevenueFieldSetter =
  | 'setProductId'
  | 'setPrice'
  | 'setQuantity'
  | 'setRevenueType'
  | 'setCurrency'
  | 'setRevenue'
  | 'setReceipt'
  | 'setReceiptSig';

const REVENUE_FIELD_MAP: Record<string, RevenueFieldSetter> = {
  productId: 'setProductId',
  price: 'setPrice',
  quantity: 'setQuantity',
  revenueType: 'setRevenueType',
  currency: 'setCurrency',
  revenue: 'setRevenue',
  receipt: 'setReceipt',
  receiptSig: 'setReceiptSig',
};

function buildRevenue(
  amp: AmplitudeSDK,
  item: Record<string, unknown>,
): InstanceType<AmplitudeSDK['Revenue']> {
  const rev = new amp.Revenue();
  for (const [key, setter] of Object.entries(REVENUE_FIELD_MAP)) {
    const value = item[key];
    if (!isDefined(value)) continue;
    (rev[setter] as (v: unknown) => InstanceType<AmplitudeSDK['Revenue']>)(
      value,
    );
  }
  if (isObject(item.eventProperties)) {
    rev.setEventProperties(item.eventProperties as Record<string, unknown>);
  }
  return rev;
}

export const destinationAmplitude: Destination = {
  type: 'amplitude',

  config: {},

  async init({ config, env }) {
    const settings = config.settings;
    if (!settings?.apiKey) return false;

    const amp = getAmplitude(env as Env | undefined);
    // Destructure walkerOS-specific keys out; the rest flow through to
    // Amplitude's BrowserOptions.
    const {
      apiKey,
      identify: _identify,
      sessionReplay,
      experiment,
      engagement,
      _state: _existingState,
      ...browserOptions
    } = settings;

    // Apply walkerOS defaults that differ from Amplitude defaults.
    const options = {
      autocapture: false,
      identityStorage: 'none' as const,
      ...browserOptions,
    };

    // Await the SDK's init promise so downstream pushes are truly ready.
    await amp.init(apiKey, options).promise;

    // Initialize runtime state.
    const _state: RuntimeState = { lastIdentity: {} };

    // Plugin: Session Replay
    if (sessionReplay) {
      await amp.add(sessionReplayPlugin(sessionReplay)).promise;
    }

    // Plugin: Engagement (Guides & Surveys)
    if (engagement) {
      const engagementOptions = engagement === true ? undefined : engagement;
      await amp.add(engagementPlugin(engagementOptions)).promise;
    }

    // Plugin: Feature Experiments (separate SDK, wires into Analytics)
    if (experiment?.deploymentKey) {
      const { deploymentKey, ...experimentConfig } = experiment;
      const experimentClient = Experiment.initializeWithAmplitudeAnalytics(
        deploymentKey,
        experimentConfig,
      );
      // Store in runtime state so on('consent') can stop it (v2 feature).
      _state.experimentClient = experimentClient;
    }

    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, env, data, collector }) {
    const amp = getAmplitude(env as Env | undefined);
    const settings = (config.settings || {}) as Settings;
    const mappingSettings = rule?.settings || {};
    const state: RuntimeState = settings._state || {};

    // 1. Reset — fires first so subsequent identity calls start clean.
    if (mappingSettings.reset !== undefined) {
      const resolved =
        typeof mappingSettings.reset === 'boolean'
          ? mappingSettings.reset
          : await getMappingValue(event, mappingSettings.reset, {
              collector,
            });
      if (resolved) {
        amp.reset();
        state.lastIdentity = {};
      }
    }

    // 2. Identity setters — rule-level override wins over destination-level.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    let identifyResolved: Record<string, unknown> | undefined;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      if (isObject(resolved)) {
        identifyResolved = resolved as Record<string, unknown>;
        state.lastIdentity = applyIdentitySetters(
          amp,
          identifyResolved,
          state.lastIdentity,
        );
      }
    }

    // 3. Identify operations — fires amplitude.identify() if the resolved
    //    object has any op keys (set, setOnce, add, ...).
    if (identifyResolved) {
      const id = buildIdentify(amp, identifyResolved);
      if (id) amp.identify(id);
    }

    // 4. Group assignment
    if (mappingSettings.group !== undefined) {
      const resolved = await getMappingValue(event, mappingSettings.group, {
        collector,
      });
      if (isObject(resolved)) {
        const { type, name } = resolved as {
          type?: unknown;
          name?: unknown;
        };
        if (isString(type) && (isString(name) || isArray(name))) {
          amp.setGroup(type, name as string | string[]);
        }
      }
    }

    // 5. Group identify (properties on the group)
    if (mappingSettings.groupIdentify !== undefined) {
      const resolved = await getMappingValue(
        event,
        mappingSettings.groupIdentify,
        { collector },
      );
      if (isObject(resolved)) {
        const { type, name } = resolved as {
          type?: unknown;
          name?: unknown;
        };
        if (isString(type) && isString(name)) {
          const id = buildIdentify(amp, resolved as Record<string, unknown>);
          if (id) amp.groupIdentify(type, name, id);
        }
      }
    }

    // 6. Revenue — single object or array from loop → N revenue() calls.
    if (mappingSettings.revenue !== undefined) {
      const resolved = await getMappingValue(event, mappingSettings.revenue, {
        collector,
      });
      const items = isArray(resolved)
        ? (resolved as Record<string, unknown>[])
        : isObject(resolved)
          ? [resolved as Record<string, unknown>]
          : [];
      for (const item of items) {
        if (!isObject(item)) continue;
        amp.revenue(buildRevenue(amp, item));
      }
    }

    // 7. Default track
    if (rule?.skip !== true) {
      const eventType = isString(rule?.name) ? rule.name : event.name;
      const eventProperties = isObject(data)
        ? (data as Record<string, unknown>)
        : {};
      amp.track(eventType, eventProperties);
    }

    // Persist state mutations back onto config.settings.
    settings._state = state;
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;
    const amp = getAmplitude(context.env as Env | undefined);

    // TODO(v2): If consent is revoked and settings.experiment was
    // configured, also call context.config.settings._state.experimentClient.stop()
    // — setOptOut() does not affect the Experiment SDK.

    const consent = context.data as WalkerOS.Consent;
    // Derive the consent key from config.consent — iterate every key the
    // destination declared as required. If ALL required keys are granted,
    // opt IN; otherwise opt OUT. A missing config.consent means nothing
    // to check and we take no action.
    const required = context.config?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );
    amp.setOptOut(!allGranted);
  },
};

export default destinationAmplitude;
