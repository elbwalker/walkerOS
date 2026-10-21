import type { Logger, WalkerOS } from '@walkeros/core';
import {
  getGrantedConsent,
  getMappingValue,
  isObject,
  isString,
  StepError,
  stepCall,
} from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';
import Clarity from '@microsoft/clarity';
import type {
  ClarityQueue,
  ClaritySDK,
  ConsentV2,
  Destination,
  Mapping,
  Settings,
} from './types';

// Types export
export * as DestinationClarity from './types';

/** The Clarity tag script, as `@microsoft/clarity` addresses it. */
const SCRIPT_SRC = 'https://www.clarity.ms/tag/';

type Category = keyof ConsentV2;

/**
 * The `window.clarity` stub the tag script replays, the one
 * `@microsoft/clarity` installs before it adds the script.
 */
function installStub(): ClarityQueue {
  const { window } = getEnv();
  if (window.clarity) return window.clarity;
  const queue: unknown[] = [];
  const clarity: ClarityQueue = Object.assign(
    (...args: unknown[]) => {
      queue.push(args);
    },
    { q: queue },
  );
  window.clarity = clarity;
  return clarity;
}

/** The tag script `loadVendor` injects; it replays the stub's queue. */
function vendor(apiKey: string, timeout?: number) {
  return loadVendor(
    `${SCRIPT_SRC}${apiKey}?ref=npm`,
    () => getEnv().window.clarity,
    { timeout },
  );
}

/**
 * The real SDK: `@microsoft/clarity` for the calls, with its script added
 * through `loadVendor`, so a script that fails to load fails every later
 * call with `vendor-not-loaded`.
 */
function realClarity(apiKey: string, timeout?: number): ClaritySDK {
  const loaded = () => vendor(apiKey, timeout).check();
  return {
    init: () => {
      installStub();
      vendor(apiKey, timeout);
    },
    identify: (...args) => {
      loaded();
      Clarity.identify(...args);
    },
    setTag: (key, value) => {
      loaded();
      Clarity.setTag(key, value);
    },
    event: (name) => {
      loaded();
      Clarity.event(name);
    },
    // A partial update names only the categories of the consent change,
    // which the SDK's typing does not allow; it forwards the same way.
    consentV2: (options) => installStub()('consentv2', options),
    upgrade: (reason) => {
      loaded();
      Clarity.upgrade(reason);
    },
  };
}

function isClaritySDK(value: unknown): value is ClaritySDK {
  return (
    isObject(value) &&
    ['init', 'identify', 'setTag', 'event', 'consentV2', 'upgrade'].every(
      (key) => typeof value[key] === 'function',
    )
  );
}

/**
 * Resolve the Clarity SDK: the caller-provided mock when available (tests),
 * otherwise the real one.
 */
function getClarity(
  env: unknown,
  apiKey: string,
  timeout?: number,
): ClaritySDK {
  const mock = isObject(env) ? env.clarity : undefined;
  if (mock === undefined) return realClarity(apiKey, timeout);
  if (isClaritySDK(mock)) return mock;
  throw new StepError('env.clarity is not a Clarity SDK', { code: 'config' });
}

const send = (fn: () => unknown) =>
  stepCall(fn, 'transport', 'Clarity call failed');

function coerceTagValue(value: unknown): string | string[] | undefined {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (isString(value)) return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return undefined; // skip nested objects
}

/** The tags of a resolved object, as Clarity.setTag takes them. */
function tagsOf(resolved: unknown): Array<[string, string | string[]]> {
  if (!isObject(resolved)) return [];
  const tags: Array<[string, string | string[]]> = [];
  for (const [key, raw] of Object.entries(resolved)) {
    const value = coerceTagValue(raw);
    if (value !== undefined) tags.push([key, value]);
  }
  return tags;
}

/**
 * Call `Clarity.identify(...)` with only the positional arguments actually
 * provided. Trailing undefined args are dropped so callers see a clean
 * signature (`identify('us3r')` instead of `identify('us3r', undefined, undefined, undefined)`).
 */
function callIdentify(
  clarity: ClaritySDK,
  customId: string,
  customSessionId?: string,
  customPageId?: string,
  friendlyName?: string,
): unknown {
  if (friendlyName !== undefined)
    return clarity.identify(
      customId,
      customSessionId,
      customPageId,
      friendlyName,
    );
  if (customPageId !== undefined)
    return clarity.identify(customId, customSessionId, customPageId);
  if (customSessionId !== undefined)
    return clarity.identify(customId, customSessionId);
  return clarity.identify(customId);
}

function isCategory(value: unknown): value is Category {
  return value === 'analytics_Storage' || value === 'ad_Storage';
}

/**
 * Clarity's ConsentV2 update for one consent change, or none to send. With
 * `settings.consent` each mapped key present in the change sets its
 * category. Without it the destination's required consent decides, as it
 * gates the pushes: a grant grants analytics storage only, a revocation
 * denies both. Ad storage is granted only through `settings.consent`.
 */
function consentOf(
  settings: unknown,
  required: WalkerOS.Consent | undefined,
  change: Record<string, unknown>,
  state: WalkerOS.Consent,
): ConsentV2 | undefined {
  const consentMap = isObject(settings) ? settings.consent : undefined;
  if (isObject(consentMap)) {
    const v2: ConsentV2 = {};
    for (const [walkerKey, category] of Object.entries(consentMap)) {
      if (!isCategory(category) || !(walkerKey in change)) continue;
      v2[category] = change[walkerKey] === true ? 'granted' : 'denied';
    }
    return Object.keys(v2).length ? v2 : undefined;
  }

  if (!required || !Object.keys(required).some((key) => key in change))
    return undefined;
  return getGrantedConsent(required, state) !== false
    ? { analytics_Storage: 'granted' }
    : { analytics_Storage: 'denied', ad_Storage: 'denied' };
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
  logger.debug(`Clarity skipped ${call}: ${key} resolved to nothing`, {
    event: event.name,
  });
}

export const destinationClarity: Destination = {
  type: 'clarity',

  config: {},

  async init({ config, env }) {
    const apiKey = config.settings?.apiKey;
    if (!apiKey)
      throw new StepError('Clarity needs settings.apiKey', { code: 'config' });

    await stepCall(
      () => getClarity(env, apiKey, config.timeout).init(apiKey),
      'vendor-not-ready',
      'Clarity init failed',
    );
  },

  async push(event, { config, rule, env, data, collector, logger }) {
    const settings: Partial<Settings> = config.settings || {};
    const clarity = getClarity(env, settings.apiKey ?? '', config.timeout);
    const mappingSettings: Mapping = rule?.settings || {};

    // 1. Identify - rule-level override wins over destination-level.
    //    Fires first per Clarity's own guidance so subsequent tag/event
    //    calls are associated with the right user.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      const { customId, customSessionId, customPageId, friendlyName } =
        isObject(resolved) ? resolved : {};
      if (isString(customId) && customId) {
        await send(() =>
          callIdentify(
            clarity,
            customId,
            isString(customSessionId) ? customSessionId : undefined,
            isString(customPageId) ? customPageId : undefined,
            isString(friendlyName) ? friendlyName : undefined,
          ),
        );
      } else skipped(logger, event, 'identify', 'identify');
    }

    // 2. Include tags - pre-flattened by core into context.data
    for (const [key, value] of tagsOf(data))
      await send(() => clarity.setTag(key, value));

    // 3. Explicit tags via mapping.settings.set
    if (mappingSettings.set !== undefined) {
      const resolved = await getMappingValue(event, mappingSettings.set, {
        collector,
      });
      const tags = tagsOf(resolved);
      for (const [key, value] of tags)
        await send(() => clarity.setTag(key, value));
      if (!tags.length) skipped(logger, event, 'setTag', 'set');
    }

    // 4. Session priority upgrade
    if (mappingSettings.upgrade !== undefined) {
      const reason = await getMappingValue(event, mappingSettings.upgrade, {
        collector,
      });
      if (isString(reason) && reason) await send(() => clarity.upgrade(reason));
      else skipped(logger, event, 'upgrade', 'upgrade');
    }

    // 5. Default event forwarding - unless rule.silent is set
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      await send(() => clarity.event(eventName));
    }

    // A silent rule whose settings resolve nothing sends nothing: a
    // declared skip, not a failure.
  },

  async on(type, { config, data, env, collector }) {
    if (type !== 'consent' || !isObject(data)) return;
    const v2 = consentOf(
      config.settings,
      config.consent,
      data,
      collector.consent,
    );
    if (!v2) return;

    const apiKey = isObject(config.settings) ? config.settings.apiKey : '';
    await stepCall(
      () =>
        getClarity(
          env,
          isString(apiKey) ? apiKey : '',
          config.timeout,
        ).consentV2(v2),
      'consent-not-applied',
      'Clarity did not take the consent update',
    );
  },
};

export default destinationClarity;
