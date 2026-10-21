import type { DestinationWeb } from '@walkeros/web-core';
import { getEnv, loadVendor } from '@walkeros/web-core';
import {
  getGrantedConsent,
  getMappingValue,
  isObject,
  isString,
  StepError,
  stepCall,
} from '@walkeros/core';
import type { Collector, Logger, Mapping, WalkerOS } from '@walkeros/core';
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
  if (window.pintrk) return;
  const pintrk: Pintrk = Object.assign(
    (...args: unknown[]) => {
      pintrk.queue?.push(args);
    },
    { queue: [], version: '3.0' },
  );
  window.pintrk = pintrk;
}

/** The pintrk queue or tag, or a StepError when it is not there. */
function getPintrk(env?: DestinationWeb.Env): Pintrk {
  const { pintrk } = getEnv(env).window;
  if (!pintrk)
    throw new StepError('Pinterest Tag not ready: pintrk is missing', {
      code: 'vendor-not-ready',
    });
  return pintrk;
}

/**
 * The core.js script `loadVendor` injects unless `loadScript` is false.
 * pintrk replays its own queue, so it is called synchronously and only a
 * failed script is reported.
 */
function vendor(
  config: { loadScript?: boolean; timeout?: number },
  env?: DestinationWeb.Env,
) {
  return loadVendor(
    config.loadScript !== false ? PINTEREST_SCRIPT_SRC : undefined,
    () => getEnv(env).window.pintrk,
    { timeout: config.timeout, document: getEnv(env).document },
  );
}

/**
 * Resolve an identify mapping value into IdentifyFields. Strict allow-list:
 * only `em` and `external_id` pass through.
 */
async function resolveIdentify(
  event: WalkerOS.Event,
  mappingValue: Mapping.Value | undefined,
  collector: Collector.Instance,
): Promise<IdentifyFields | undefined> {
  if (mappingValue === undefined || mappingValue === null) return undefined;
  const resolved = await getMappingValue(event, mappingValue, { collector });
  if (!isObject(resolved)) return undefined;
  const fields: IdentifyFields = {};
  const { em, external_id } = resolved;
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
  logger.debug(`Pinterest skipped ${call}: ${key} resolved to nothing`, {
    event: event.name,
  });
}

export const destinationPinterest: Destination = {
  type: 'pinterest',

  config: {},

  async init({ config, env }) {
    // A copy, so adding the runtime state below does not write onto the live settings
    const settings = { ...config.settings };
    if (!settings.apiKey)
      throw new StepError('Pinterest needs settings.apiKey', {
        code: 'config',
      });
    const { apiKey } = settings;

    const pageview = settings.pageview !== false;

    installPintrkQueue(env);
    vendor(config, env);

    const pintrk = getPintrk(env);

    await stepCall(
      () => pintrk('load', apiKey),
      'vendor-not-ready',
      'Pinterest load call failed',
    );
    if (pageview)
      await stepCall(
        () => pintrk('page'),
        'vendor-not-ready',
        'Pinterest page call failed',
      );

    // Seed runtime state (mutation is allowed on Settings._state).
    return {
      ...config,
      settings: {
        ...settings,
        _state: { lastIdentify: undefined, consentGranted: true },
      },
    };
  },

  async push(event, { config, rule, data, env, collector, logger }) {
    vendor(config, env).check();

    const settings: Partial<Settings> = config.settings || {};
    const state = (settings._state ||= { consentGranted: true });

    const pintrk = getPintrk(env);

    // Consent revoked: suppress. This is the consent state, not a failure.
    if (state.consentGranted !== false) {
      // 1. Identity - per-event override falls back to destination-level.
      // A silent rule whose identify resolves nothing (or an identity that
      // is already current) sends nothing: a declared skip, not a failure.
      const identifyMapping = rule?.settings?.identify ?? settings.identify;
      const identify = await resolveIdentify(event, identifyMapping, collector);
      if (!identify) {
        if (identifyMapping !== undefined)
          skipped(logger, event, 'set', 'identify');
      } else if (!identifyEqual(identify, state.lastIdentify)) {
        await stepCall(
          () => pintrk('set', identify),
          'transport',
          'Pinterest set call failed',
        );
        state.lastIdentify = identify;
      }

      // 2. Silent - process identity (above) but suppress the default track.
      if (rule?.silent !== true) {
        // 3. Track
        const eventName = isString(rule?.name) ? rule.name : event.name;

        // context.data contains both include-flattened and mapping.data-resolved
        // properties. Include is the bottom layer, mapping.data wins on conflict.
        const contextData: Record<string, unknown> = isObject(data) ? data : {};

        const eventData: EventData = {
          ...(event.id ? { event_id: event.id } : {}),
          ...contextData,
        };

        await stepCall(
          () => pintrk('track', eventName, eventData),
          'transport',
          'Pinterest track call failed',
        );
      }
    }
  },

  // Pinterest has no consent API: the destination stops its own sends. The
  // destination's required consent decides on the whole consent state, as
  // it gates the pushes, and only a change that names a required key counts.
  on(type, { config, data, collector }) {
    const required = config.consent;
    if (type !== 'consent' || !required || !isObject(data)) return;
    if (!Object.keys(required).some((key) => key in data)) return;
    const settings = config.settings;
    if (!isObject(settings)) return;

    const state = isObject(settings._state)
      ? settings._state
      : (settings._state = { consentGranted: true });
    state.consentGranted =
      getGrantedConsent(required, collector.consent) !== false;
  },
};

export default destinationPinterest;
