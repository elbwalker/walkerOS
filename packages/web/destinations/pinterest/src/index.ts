import type { DestinationWeb } from '@walkeros/web-core';
import { getEnv } from '@walkeros/web-core';
import { getMappingValue, isObject, isString } from '@walkeros/core';
import type { Collector, WalkerOS } from '@walkeros/core';
import type {
  Destination,
  EventData,
  IdentifyFields,
  Pintrk,
  Settings,
} from './types';

// Types export
export * as DestinationPinterest from './types';

const PINTEREST_SCRIPT_SRC = 'https://s.pinimg.com/ct/core.js';

/**
 * Install the Pinterest `window.pintrk` queue shim. Mirrors the official
 * snippet - any call made before core.js loads is pushed onto `pintrk.queue`,
 * which the real script processes once it initializes. Idempotent.
 */
function installPintrkQueue(env?: DestinationWeb.Env): void {
  const { window } = getEnv(env);
  const w = window as Window & { pintrk?: Pintrk };
  if (w.pintrk) return;
  const queue: unknown[][] = [];
  const fn = ((...args: unknown[]) => {
    (w.pintrk!.queue as unknown[][]).push(args);
  }) as unknown as Pintrk;
  fn.queue = queue;
  fn.version = '3.0';
  w.pintrk = fn;
}

/**
 * Insert the Pinterest core.js script tag. Async, non-blocking. Matches the
 * plausible/meta precedent.
 */
function addScript(env?: DestinationWeb.Env): void {
  const { document } = getEnv(env);
  const doc = document as Document;
  const script = doc.createElement('script');
  script.src = PINTEREST_SCRIPT_SRC;
  script.async = true;
  doc.head.appendChild(script);
}

/**
 * Resolve an identify mapping value into IdentifyFields. Strict allow-list:
 * only `em` and `external_id` pass through.
 */
async function resolveIdentify(
  event: WalkerOS.Event,
  mappingValue: unknown,
  collector: Collector.Instance,
): Promise<IdentifyFields | undefined> {
  if (mappingValue === undefined || mappingValue === null) return undefined;
  const resolved = await getMappingValue(
    event,
    mappingValue as Parameters<typeof getMappingValue>[1],
    { collector },
  );
  if (!isObject(resolved)) return undefined;
  const fields: IdentifyFields = {};
  const em = (resolved as Record<string, unknown>).em;
  const external_id = (resolved as Record<string, unknown>).external_id;
  if (isString(em) && em) fields.em = em;
  if (isString(external_id) && external_id) fields.external_id = external_id;
  return Object.keys(fields).length > 0 ? fields : undefined;
}

/**
 * Shallow-equal compare two IdentifyFields - used to suppress redundant
 * pintrk('set', ...) calls when the resolved identity has not changed.
 */
function identifyEqual(a?: IdentifyFields, b?: IdentifyFields): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.em === b.em && a.external_id === b.external_id;
}

export const destinationPinterest: Destination = {
  type: 'pinterest',

  config: {},

  init({ config, env }) {
    const settings = config.settings;
    if (!settings?.apiKey) return false;

    const pageview = settings.pageview !== false;

    installPintrkQueue(env);
    if (config.loadScript !== false) addScript(env);

    const { window } = getEnv(env);
    const pintrk = (window as Window).pintrk as Pintrk;

    pintrk('load', settings.apiKey);
    if (pageview) pintrk('page');

    // Seed runtime state (mutation is allowed on Settings._state).
    settings._state = {
      lastIdentify: undefined,
      consentGranted: true,
    };

    return config;
  },

  async push(event, { config, rule, data, env, collector }) {
    const settings = (config.settings || {}) as Settings;
    const state = (settings._state ||= { consentGranted: true });
    if (state.consentGranted === false) return; // Consent revoked - suppress

    const { window } = getEnv(env);
    const pintrk = (window as Window).pintrk as Pintrk;
    if (!pintrk) return;

    // 1. Identity - per-event override falls back to destination-level.
    const identifyMapping =
      (rule?.settings?.identify as unknown) ?? settings.identify;
    const identify = await resolveIdentify(event, identifyMapping, collector);
    if (identify && !identifyEqual(identify, state.lastIdentify)) {
      pintrk('set', identify);
      state.lastIdentify = identify;
    }

    // 2. Silent - process identity (above) but suppress the default track.
    if (rule?.silent === true) return;

    // 3. Track
    const eventName = isString(rule?.name)
      ? (rule!.name as string)
      : event.name;

    // context.data contains both include-flattened and mapping.data-resolved
    // properties. Include is the bottom layer, mapping.data wins on conflict.
    const contextData: Record<string, unknown> = isObject(data)
      ? (data as Record<string, unknown>)
      : {};

    const eventData: EventData = {
      ...(event.id ? { event_id: event.id } : {}),
      ...contextData,
    };

    pintrk('track', eventName, eventData);
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;
    const settings = context.config?.settings as Settings | undefined;
    if (!settings) return;

    const consent = context.data as WalkerOS.Consent;
    const required = context.config?.consent;
    if (!required) return;

    const keys = Object.keys(required);
    if (keys.length === 0) return;

    // Deny as soon as any required key is explicitly false. Grant only if
    // every required key is explicitly true.
    let anyDenied = false;
    let allGranted = true;
    for (const key of keys) {
      if (consent[key] === true) continue;
      if (consent[key] === false) {
        anyDenied = true;
        allGranted = false;
      } else {
        // undefined / unknown - don't flip
        allGranted = false;
      }
    }

    const state = (settings._state ||= { consentGranted: true });
    if (anyDenied) {
      state.consentGranted = false;
    } else if (allGranted) {
      state.consentGranted = true;
    }
  },
};

export default destinationPinterest;
