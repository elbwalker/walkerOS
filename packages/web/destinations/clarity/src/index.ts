import type { WalkerOS } from '@walkeros/core';
import { getMappingValue, isObject, isString } from '@walkeros/core';
import type { Destination, Env, Mapping, Settings } from './types';

// Types export
export * as DestinationClarity from './types';

const INCLUDE_SECTIONS: Record<string, (e: WalkerOS.Event) => unknown> = {
  data: (e) => e.data,
  globals: (e) => e.globals,
  context: (e) => e.context,
  user: (e) => e.user,
  source: (e) => e.source,
  version: (e) => e.version,
  event: (e) => ({
    entity: e.entity,
    action: e.action,
    id: e.id,
    timestamp: e.timestamp,
    name: e.name,
  }),
};

function coerceTagValue(value: unknown): string | string[] | undefined {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (isString(value)) return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return undefined; // skip nested objects
}

function emitTag(clarity: Env['clarity'], key: string, raw: unknown): void {
  const value = coerceTagValue(raw);
  if (value === undefined) return;
  clarity.setTag(key, value);
}

function setIncludeTags(
  event: WalkerOS.Event,
  sections: string[],
  clarity: Env['clarity'],
): void {
  const effective = sections.includes('all')
    ? Object.keys(INCLUDE_SECTIONS)
    : sections;
  for (const section of effective) {
    const picker = INCLUDE_SECTIONS[section];
    if (!picker) continue;
    const bag = picker(event);
    if (!isObject(bag)) continue;
    for (const [key, raw] of Object.entries(bag)) {
      emitTag(clarity, `${section}_${key}`, raw);
    }
  }
}

export const destinationClarity: Destination = {
  type: 'clarity',

  config: {},

  init({ config, env }) {
    const settings = config.settings;
    if (!settings?.apiKey) return false;

    // env.clarity must be wired by the caller. Tests pass a mock; production
    // wires the @microsoft/clarity default export via dev.ts.
    env?.clarity.init(settings.apiKey);

    return config;
  },

  async push(event, { config, rule, env }) {
    if (!env) return;
    const settings = (config.settings || {}) as Partial<Settings>;
    const mappingSettings = (rule?.settings || {}) as Mapping;

    // 1. Include tags — rule-level override → destination-level → none
    const includeSections = mappingSettings.include ?? settings.include ?? [];
    if (includeSections.length > 0) {
      setIncludeTags(event, includeSections, env.clarity);
    }

    // 2. Explicit tags via mapping.settings.set
    if (mappingSettings.set !== undefined) {
      const resolved = await getMappingValue(event, mappingSettings.set);
      if (isObject(resolved)) {
        for (const [key, raw] of Object.entries(resolved)) {
          emitTag(env.clarity, key, raw);
        }
      }
    }

    // 3. Session upgrade
    if (mappingSettings.upgrade !== undefined) {
      const reason = await getMappingValue(event, mappingSettings.upgrade);
      if (isString(reason) && reason) {
        env.clarity.upgrade(reason);
      }
    }

    // 4. Identify — per-event rule override wins over destination-level
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping);
      if (isObject(resolved)) {
        const { customId, customSessionId, customPageId, friendlyName } =
          resolved as {
            customId?: string;
            customSessionId?: string;
            customPageId?: string;
            friendlyName?: string;
          };
        if (customId && isString(customId)) {
          env.clarity.identify(
            customId,
            isString(customSessionId) ? customSessionId : undefined,
            isString(customPageId) ? customPageId : undefined,
            isString(friendlyName) ? friendlyName : undefined,
          );
        }
      }
    }

    // 5. Default event forwarding — unless rule.skip is set
    if (rule?.skip !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      env.clarity.event(eventName);
    }
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;
    const env = context.env as Env | undefined;
    if (!env) return;

    const consent = context.data as WalkerOS.Consent;
    const settings = (context.config?.settings || {}) as Partial<Settings>;
    const consentMap = settings.consent;
    if (!consentMap) return; // No translation table, no action

    const v2: {
      analytics_Storage?: 'granted' | 'denied';
      ad_Storage?: 'granted' | 'denied';
    } = {};
    let anyGranted = false;
    let anyDenied = false;

    for (const [walkerKey, clarityKey] of Object.entries(consentMap)) {
      if (!(walkerKey in consent)) continue;
      const granted = consent[walkerKey] === true;
      v2[clarityKey] = granted ? 'granted' : 'denied';
      if (granted) anyGranted = true;
      else anyDenied = true;
    }

    if (Object.keys(v2).length === 0) return;

    env.clarity.consentV2(
      v2 as {
        analytics_Storage: 'granted' | 'denied';
        ad_Storage: 'granted' | 'denied';
      },
    );

    // Full revocation — also call the legacy v1 API to erase cookies.
    if (anyDenied && !anyGranted) {
      env.clarity.consent(false);
    }
  },
};

export default destinationClarity;
