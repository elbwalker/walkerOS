import type { Collector, WalkerOS } from '@walkeros/core';
import {
  getGrantedConsent,
  getMappingValue,
  isArray,
  isDefined,
  isNumber,
  isObject,
  isString,
  StepError,
} from '@walkeros/core';
import * as amplitudeSDK from '@amplitude/unified';
import type {
  AmplitudeSDK,
  Destination,
  IdentifyInstance,
  Mapping,
  RevenueInstance,
  RuntimeState,
  Settings,
} from './types';

// Types export
export * as DestinationAmplitude from './types';

type RealSDK = AmplitudeSDK<amplitudeSDK.Identify, amplitudeSDK.Revenue>;

let real: RealSDK | undefined;

/**
 * The real SDK: one @amplitude/unified client, as the module's own default
 * client is one per page. Created on first use; its `init` sets up analytics
 * alone, `initAll` adds the three plugins.
 */
function realAmplitude(): RealSDK {
  if (real) return real;
  const client = amplitudeSDK.createInstance();
  real = {
    // The unified client forwards three arguments, and with three the
    // analytics SDK reads the second as a user id: the options go third.
    init: (apiKey, options) => client.init(apiKey, undefined, options),
    initAll: (apiKey, options) => client.initAll(apiKey, options),
    track: (eventType, eventProperties) =>
      client.track(eventType, eventProperties),
    identify: (identify) => client.identify(identify),
    revenue: (revenue) => client.revenue(revenue),
    reset: () => client.reset(),
    setOptOut: (optOut) => client.setOptOut(optOut),
    setUserId: (userId) => client.setUserId(userId),
    setDeviceId: (deviceId) => client.setDeviceId(deviceId),
    setSessionId: (sessionId) => client.setSessionId(sessionId),
    setGroup: (groupType, groupName) => client.setGroup(groupType, groupName),
    groupIdentify: (groupType, groupName, identify) =>
      client.groupIdentify(groupType, groupName, identify),
    Identify: amplitudeSDK.Identify,
    Revenue: amplitudeSDK.Revenue,
  };
  return real;
}

/** The caller-provided mock (tests), if the env carries one. */
function mockOf(env: unknown): AmplitudeSDK | undefined {
  const amplitude = isObject(env) ? env.amplitude : undefined;
  if (amplitude === undefined || isAmplitudeSDK(amplitude)) return amplitude;
  throw new StepError('env.amplitude is not an Amplitude SDK', {
    code: 'config',
  });
}

function isAmplitudeSDK(value: unknown): value is AmplitudeSDK {
  return (
    isObject(value) &&
    [
      'init',
      'initAll',
      'track',
      'identify',
      'revenue',
      'reset',
      'setOptOut',
      'setUserId',
      'setDeviceId',
      'setSessionId',
      'setGroup',
      'groupIdentify',
      'Identify',
      'Revenue',
    ].every((key) => typeof value[key] === 'function')
  );
}

/**
 * Waits for one SDK call: its promise, or the `promise` an AmplitudeReturn
 * carries. A throw or a rejection becomes a StepError.
 */
async function call(
  fn: () => unknown,
  code: string,
  message: string,
  settle = false,
): Promise<void> {
  try {
    const result = await fn();
    if (settle && isObject(result) && result.promise instanceof Promise)
      await result.promise;
  } catch (error) {
    throw new StepError(message, { code, cause: error });
  }
}

const send = (fn: () => unknown) =>
  call(fn, 'transport', 'Amplitude call failed');

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
async function applyIdentitySetters<
  I extends IdentifyInstance,
  R extends RevenueInstance,
>(
  amp: AmplitudeSDK<I, R>,
  sent: (fn: () => unknown) => Promise<void>,
  resolved: Record<string, unknown>,
  lastIdentity: RuntimeState['lastIdentity'] = {},
): Promise<NonNullable<RuntimeState['lastIdentity']>> {
  const updated = { ...lastIdentity };

  if ('user' in resolved) {
    const user = resolved.user;
    if (user === null || user === '') {
      await sent(() => amp.setUserId(undefined));
      delete updated.user;
    } else if (isString(user) && user !== lastIdentity.user) {
      await sent(() => amp.setUserId(user));
      updated.user = user;
    }
  }

  if ('device' in resolved) {
    const device = resolved.device;
    if (isString(device) && device !== lastIdentity.device) {
      await sent(() => amp.setDeviceId(device));
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
      await sent(() => amp.setSessionId(asNumber));
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
function buildIdentify<I extends IdentifyInstance, R extends RevenueInstance>(
  amp: AmplitudeSDK<I, R>,
  resolved: Record<string, unknown>,
): I | undefined {
  let identify: I | undefined;
  const ensure = (): I => {
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

/** A Revenue instance from one resolved item, each field by its type. */
function buildRevenue<I extends IdentifyInstance, R extends RevenueInstance>(
  amp: AmplitudeSDK<I, R>,
  item: Record<string, unknown>,
): R {
  const rev = new amp.Revenue();
  const { productId, price, quantity, revenueType, currency, revenue } = item;
  const { receipt, receiptSig, eventProperties } = item;
  if (isString(productId)) rev.setProductId(productId);
  if (isNumber(price)) rev.setPrice(price);
  if (isNumber(quantity)) rev.setQuantity(quantity);
  if (isString(revenueType)) rev.setRevenueType(revenueType);
  if (isString(currency)) rev.setCurrency(currency);
  if (isNumber(revenue)) rev.setRevenue(revenue);
  if (isString(receipt)) rev.setReceipt(receipt);
  if (isString(receiptSig)) rev.setReceiptSig(receiptSig);
  if (isObject(eventProperties)) rev.setEventProperties(eventProperties);
  return rev;
}

/** Starts the SDK: analytics alone, or with the plugins the settings enable. */
async function start<I extends IdentifyInstance, R extends RevenueInstance>(
  amp: AmplitudeSDK<I, R>,
  settings: Settings,
): Promise<void> {
  const {
    apiKey,
    identify: _identify,
    sessionReplay,
    experiment,
    engagement,
    _state: _existingState,
    ...browserOptions
  } = settings;

  const analyticsOptions = {
    autocapture: false,
    identityStorage: 'none' as const,
    ...browserOptions,
  };

  // Session Replay, Experiment and Guides & Surveys are opt-in: without any
  // of them only analytics starts. @amplitude/unified sets up all three
  // together, so one enabled plugin brings the other two.
  const plugins = Boolean(
    sessionReplay || experiment?.deploymentKey || engagement,
  );

  if (!plugins)
    return call(
      () => amp.init(apiKey, analyticsOptions),
      'vendor-not-ready',
      'Amplitude init failed',
      true,
    );

  return call(
    () =>
      amp.initAll(apiKey, {
        serverZone: analyticsOptions.serverZone,
        analytics: analyticsOptions,
        ...(sessionReplay ? { sessionReplay } : {}),
        ...(experiment?.deploymentKey ? { experiment } : {}),
        ...(engagement
          ? { engagement: engagement === true ? undefined : engagement }
          : {}),
      }),
    'vendor-not-ready',
    'Amplitude init failed',
  );
}

async function pushTo<I extends IdentifyInstance, R extends RevenueInstance>(
  amp: AmplitudeSDK<I, R>,
  event: WalkerOS.Event,
  settings: Settings,
  mappingSettings: Mapping,
  rule: { name?: unknown; silent?: boolean } | undefined,
  data: unknown,
  collector: Collector.Instance,
): Promise<void> {
  const state: RuntimeState = settings._state || {};
  let calls = 0;
  const sent = (fn: () => unknown) => {
    calls++;
    return send(fn);
  };

  // 1. Reset - fires first so subsequent identity calls start clean.
  if (mappingSettings.reset !== undefined) {
    const resolved =
      typeof mappingSettings.reset === 'boolean'
        ? mappingSettings.reset
        : await getMappingValue(event, mappingSettings.reset, {
            collector,
          });
    if (resolved) {
      await sent(() => amp.reset());
      state.lastIdentity = {};
    }
  }

  // 2. Identity setters - rule-level override wins over destination-level.
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  let identifyResolved: Record<string, unknown> | undefined;
  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) {
      identifyResolved = resolved;
      state.lastIdentity = await applyIdentitySetters(
        amp,
        sent,
        resolved,
        state.lastIdentity,
      );
    }
  }

  // 3. Identify operations - fires amplitude.identify() if the resolved
  //    object has any op keys (set, setOnce, add, ...).
  if (identifyResolved) {
    const id = buildIdentify(amp, identifyResolved);
    if (id) await sent(() => amp.identify(id));
  }

  // 4. Group assignment
  if (mappingSettings.group !== undefined) {
    const resolved = await getMappingValue(event, mappingSettings.group, {
      collector,
    });
    if (isObject(resolved)) {
      const { type, name } = resolved;
      if (isString(type) && (isString(name) || isStringArray(name)))
        await sent(() => amp.setGroup(type, name));
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
      const { type, name } = resolved;
      if (isString(type) && isString(name)) {
        const id = buildIdentify(amp, resolved);
        if (id) await sent(() => amp.groupIdentify(type, name, id));
      }
    }
  }

  // 6. Revenue - single object or array from loop → N revenue() calls.
  if (mappingSettings.revenue !== undefined) {
    const resolved = await getMappingValue(event, mappingSettings.revenue, {
      collector,
    });
    const items = isArray(resolved) ? resolved : [resolved];
    for (const item of items) {
      if (!isObject(item)) continue;
      const revenue = buildRevenue(amp, item);
      await sent(() => amp.revenue(revenue));
    }
  }

  // 7. Default track
  if (rule?.silent !== true) {
    const eventType = isString(rule?.name) ? rule.name : event.name;
    const eventProperties = isObject(data) ? data : {};
    await sent(() => amp.track(eventType, eventProperties));
  }

  // Persist state mutations back onto config.settings.
  settings._state = state;

  // A silent rule whose own settings resolved nothing sent nothing.
  const ruleSettings =
    mappingSettings.reset !== undefined ||
    mappingSettings.identify !== undefined ||
    mappingSettings.group !== undefined ||
    mappingSettings.groupIdentify !== undefined ||
    mappingSettings.revenue !== undefined;
  if (!calls && ruleSettings)
    throw new StepError(
      `Amplitude: the silent rule of "${event.name}" resolved no identity, group or revenue`,
      { code: 'missing-input' },
    );
}

function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

export const destinationAmplitude: Destination = {
  type: 'amplitude',

  config: {},

  // The SDK starts in init, so it collects from page load on.
  async init({ config, env }) {
    const apiKey = config.settings?.apiKey;
    if (!apiKey)
      throw new StepError('Amplitude needs settings.apiKey', {
        code: 'config',
      });
    const settings: Settings = { ...config.settings, apiKey };

    const mock = mockOf(env);
    if (mock) await start(mock, settings);
    else
      await start(realAmplitude(), settings).catch((error: unknown) => {
        // The SDK answers a second init after a failed one as done without
        // starting: the next attempt gets a fresh client.
        real = undefined;
        throw error;
      });

    const _state: RuntimeState = { lastIdentity: {} };
    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, env, data, collector }) {
    const settings: Settings = { apiKey: '', ...config.settings };
    const mappingSettings: Mapping = rule?.settings || {};
    const mock = mockOf(env);
    await (mock
      ? pushTo(mock, event, settings, mappingSettings, rule, data, collector)
      : pushTo(
          realAmplitude(),
          event,
          settings,
          mappingSettings,
          rule,
          data,
          collector,
        ));
  },

  // The destination's required consent decides, as it gates the pushes: a
  // revocation opts out of Amplitude, a grant opts back in.
  async on(type, { config, data, env, collector }) {
    const required = config.consent;
    if (type !== 'consent' || !required || !isObject(data)) return;
    if (!Object.keys(required).some((key) => key in data)) return;

    const granted = getGrantedConsent(required, collector.consent) !== false;
    const amp = mockOf(env) ?? realAmplitude();
    await call(
      () => amp.setOptOut(!granted),
      'consent-not-applied',
      'Amplitude did not take the consent update',
    );
  },
};

export default destinationAmplitude;
