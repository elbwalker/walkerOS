import type { Collector, Logger, WalkerOS } from '@walkeros/core';
import {
  getGrantedConsent,
  getMappingValue,
  isArray,
  isDefined,
  isNumber,
  isObject,
  isString,
  StepError,
  stepCall,
} from '@walkeros/core';
import * as amplitudeSDK from '@amplitude/unified';
import type {
  AmplitudePlugin,
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
 * client is one per page. Created on first use; its `init` sets up analytics,
 * `add` one plugin at a time.
 */
function realAmplitude(): RealSDK {
  if (real) return real;
  const client = amplitudeSDK.createInstance();
  real = {
    // The unified client forwards three arguments, and with three the
    // analytics SDK reads the second as a user id: the options go third.
    init: (apiKey, options) => client.init(apiKey, undefined, options),
    add: (plugin) => client.add(plugin),
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
      'add',
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

const send = (fn: () => unknown) =>
  stepCall(fn, 'transport', 'Amplitude call failed');

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
  logger.debug(`Amplitude skipped ${call}: ${key} resolved to nothing`, {
    event: event.name,
  });
}

/** Waits for a call and the `promise` its AmplitudeReturn carries. */
async function settled(fn: () => unknown): Promise<void> {
  const result = await fn();
  if (isObject(result) && result.promise instanceof Promise)
    await result.promise;
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
async function applyIdentitySetters<
  I extends IdentifyInstance,
  R extends RevenueInstance,
>(
  amp: AmplitudeSDK<I, R>,
  send: (fn: () => unknown) => Promise<unknown>,
  resolved: Record<string, unknown>,
  lastIdentity: RuntimeState['lastIdentity'] = {},
): Promise<NonNullable<RuntimeState['lastIdentity']>> {
  const updated = { ...lastIdentity };

  if ('user' in resolved) {
    const user = resolved.user;
    if (user === null || user === '') {
      await send(() => amp.setUserId(undefined));
      delete updated.user;
    } else if (isString(user) && user !== lastIdentity.user) {
      await send(() => amp.setUserId(user));
      updated.user = user;
    }
  }

  if ('device' in resolved) {
    const device = resolved.device;
    if (isString(device) && device !== lastIdentity.device) {
      await send(() => amp.setDeviceId(device));
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
      await send(() => amp.setSessionId(asNumber));
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

/** Starts analytics, then each plugin the settings enable, in that order. */
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

  await stepCall(
    () => settled(() => amp.init(apiKey, analyticsOptions)),
    'vendor-not-ready',
    'Amplitude init failed',
  );

  // Session Replay, Experiment and Guides & Surveys are opt-in, each on its
  // own: only the ones the settings enable start, on the analytics server
  // zone and instance. Each package loads only then, with a dynamic import:
  // a static one of @amplitude/engagement-browser (an ESM entry without
  // "type": "module") can come in as CommonJS without its named exports
  // under Node loaders such as tsx, and failed every import of this module.
  const { serverZone, instanceName } = analyticsOptions;
  const shared = {
    ...(serverZone ? { serverZone } : {}),
    ...(instanceName ? { instanceName } : {}),
  };
  const plugins: Array<[string, () => Promise<AmplitudePlugin>]> = [];
  if (sessionReplay)
    plugins.push([
      'Session Replay',
      async () => {
        const { sessionReplayPlugin } =
          await import('@amplitude/plugin-session-replay-browser');
        return sessionReplayPlugin({ ...sessionReplay, ...shared });
      },
    ]);
  if (experiment?.deploymentKey)
    plugins.push([
      'Experiment',
      async () => {
        const { experimentPlugin } =
          await import('@amplitude/plugin-experiment-browser');
        return experimentPlugin({ ...experiment, ...shared });
      },
    ]);
  if (engagement)
    plugins.push([
      'Guides & Surveys',
      async () => {
        const { plugin } = await import('@amplitude/engagement-browser');
        return plugin({
          ...(engagement === true ? {} : engagement),
          ...shared,
        });
      },
    ]);

  for (const [name, create] of plugins)
    await stepCall(
      async () => {
        const plugin = await create();
        await settled(() => amp.add(plugin));
      },
      'vendor-not-ready',
      `Amplitude ${name} failed to start`,
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
  logger: Logger.Instance,
): Promise<void> {
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
      await send(() => amp.reset());
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
        send,
        resolved,
        state.lastIdentity,
      );
    } else skipped(logger, event, 'identify', 'identify');
  }

  // 3. Identify operations - fires amplitude.identify() if the resolved
  //    object has any op keys (set, setOnce, add, ...).
  if (identifyResolved) {
    const id = buildIdentify(amp, identifyResolved);
    if (id) await send(() => amp.identify(id));
  }

  // 4. Group assignment
  if (mappingSettings.group !== undefined) {
    const resolved = await getMappingValue(event, mappingSettings.group, {
      collector,
    });
    const { type, name } = isObject(resolved) ? resolved : {};
    if (isString(type) && (isString(name) || isStringArray(name)))
      await send(() => amp.setGroup(type, name));
    else skipped(logger, event, 'setGroup', 'group');
  }

  // 5. Group identify (properties on the group)
  if (mappingSettings.groupIdentify !== undefined) {
    const resolved = await getMappingValue(
      event,
      mappingSettings.groupIdentify,
      { collector },
    );
    const { type, name } = isObject(resolved) ? resolved : {};
    const id =
      isObject(resolved) && isString(type) && isString(name)
        ? buildIdentify(amp, resolved)
        : undefined;
    if (id && isString(type) && isString(name))
      await send(() => amp.groupIdentify(type, name, id));
    else skipped(logger, event, 'groupIdentify', 'groupIdentify');
  }

  // 6. Revenue - single object or array from loop → N revenue() calls.
  if (mappingSettings.revenue !== undefined) {
    const resolved = await getMappingValue(event, mappingSettings.revenue, {
      collector,
    });
    let sent = 0;
    for (const item of isArray(resolved) ? resolved : [resolved]) {
      if (!isObject(item)) continue;
      const revenue = buildRevenue(amp, item);
      await send(() => amp.revenue(revenue));
      sent++;
    }
    if (!sent) skipped(logger, event, 'revenue', 'revenue');
  }

  // 7. Default track
  if (rule?.silent !== true) {
    const eventType = isString(rule?.name) ? rule.name : event.name;
    const eventProperties = isObject(data) ? data : {};
    await send(() => amp.track(eventType, eventProperties));
  }

  // Persist state mutations back onto config.settings. A silent rule whose
  // settings resolve nothing (or an identity that is already current) sends
  // nothing: a declared skip, not a failure.
  settings._state = state;
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

  async push(event, { config, rule, env, data, collector, logger }) {
    const settings: Settings = { apiKey: '', ...config.settings };
    const mappingSettings: Mapping = rule?.settings || {};
    const mock = mockOf(env);
    await (mock
      ? pushTo(
          mock,
          event,
          settings,
          mappingSettings,
          rule,
          data,
          collector,
          logger,
        )
      : pushTo(
          realAmplitude(),
          event,
          settings,
          mappingSettings,
          rule,
          data,
          collector,
          logger,
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
    await stepCall(
      () => amp.setOptOut(!granted),
      'consent-not-applied',
      'Amplitude did not take the consent update',
    );
  },
};

export default destinationAmplitude;
