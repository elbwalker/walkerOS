import type { WalkerOS } from '@walkeros/core';
import { getMappingValue, isObject, isString } from '@walkeros/core';
import Clarity from '@microsoft/clarity';
import type { ClaritySDK, Destination, Env, Mapping, Settings } from './types';

// Types export
export * as DestinationClarity from './types';

/**
 * Resolve the Clarity SDK: use the caller-provided mock when available
 * (tests), otherwise fall back to the real `@microsoft/clarity` default
 * export. Matches the pattern used by @walkeros/server-destination-gcp for
 * the BigQuery SDK.
 */
function getClarity(env: Env | undefined): ClaritySDK {
  return env?.clarity ?? (Clarity as unknown as ClaritySDK);
}

function coerceTagValue(value: unknown): string | string[] | undefined {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (isString(value)) return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return undefined; // skip nested objects
}

function emitTag(clarity: ClaritySDK, key: string, raw: unknown): void {
  const value = coerceTagValue(raw);
  if (value === undefined) return;
  clarity.setTag(key, value);
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
): void {
  if (friendlyName !== undefined) {
    clarity.identify(customId, customSessionId, customPageId, friendlyName);
  } else if (customPageId !== undefined) {
    clarity.identify(customId, customSessionId, customPageId);
  } else if (customSessionId !== undefined) {
    clarity.identify(customId, customSessionId);
  } else {
    clarity.identify(customId);
  }
}

export const destinationClarity: Destination = {
  type: 'clarity',

  config: {},

  init({ config, env }) {
    const settings = config.settings;
    if (!settings?.apiKey) return false;

    getClarity(env).init(settings.apiKey);

    return config;
  },

  async push(event, { config, rule, env, data }) {
    const clarity = getClarity(env as Env | undefined);
    const settings = (config.settings || {}) as Partial<Settings>;
    const mappingSettings = (rule?.settings || {}) as Mapping;

    // 1. Identify - rule-level override wins over destination-level.
    //    Fires first per Clarity's own guidance so subsequent tag/event
    //    calls are associated with the right user.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping);
      if (isObject(resolved)) {
        const { customId, customSessionId, customPageId, friendlyName } =
          resolved as {
            customId?: unknown;
            customSessionId?: unknown;
            customPageId?: unknown;
            friendlyName?: unknown;
          };
        if (isString(customId) && customId) {
          callIdentify(
            clarity,
            customId,
            isString(customSessionId) ? customSessionId : undefined,
            isString(customPageId) ? customPageId : undefined,
            isString(friendlyName) ? friendlyName : undefined,
          );
        }
      }
    }

    // 2. Include tags - pre-flattened by core into context.data
    if (isObject(data)) {
      for (const [key, raw] of Object.entries(
        data as Record<string, unknown>,
      )) {
        emitTag(clarity, key, raw);
      }
    }

    // 3. Explicit tags via mapping.settings.set
    if (mappingSettings.set !== undefined) {
      const resolved = await getMappingValue(event, mappingSettings.set);
      if (isObject(resolved)) {
        for (const [key, raw] of Object.entries(resolved)) {
          emitTag(clarity, key, raw);
        }
      }
    }

    // 4. Session priority upgrade
    if (mappingSettings.upgrade !== undefined) {
      const reason = await getMappingValue(event, mappingSettings.upgrade);
      if (isString(reason) && reason) {
        clarity.upgrade(reason);
      }
    }

    // 5. Default event forwarding - unless rule.silent is set
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      clarity.event(eventName);
    }
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;
    const clarity = getClarity(context.env as Env | undefined);

    const consent = context.data as WalkerOS.Consent;
    const settings = (context.config?.settings || {}) as Partial<Settings>;
    const consentMap = settings.consent;
    if (!consentMap) return; // Users MUST configure settings.consent; without it we take no action.

    const v2: {
      analytics_Storage?: 'granted' | 'denied';
      ad_Storage?: 'granted' | 'denied';
    } = {};

    for (const [walkerKey, clarityKey] of Object.entries(consentMap)) {
      if (!(walkerKey in consent)) continue;
      v2[clarityKey] = consent[walkerKey] === true ? 'granted' : 'denied';
    }

    if (Object.keys(v2).length === 0) return;

    clarity.consentV2(
      v2 as {
        analytics_Storage: 'granted' | 'denied';
        ad_Storage: 'granted' | 'denied';
      },
    );
  },
};

export default destinationClarity;
