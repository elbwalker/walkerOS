import type { WalkerOS } from '@walkeros/core';
import { isObject, StepError, stepCall } from '@walkeros/core';
import {
  DEFAULT_CONSENT_MODE_MAPPING,
  consentModeParameters,
  getEnv,
  resolveConsentMode,
} from '@walkeros/web-core';
import type { D8aConfigParams, D8aFn } from '@d8a-tech/wt';
import { installD8a } from '@d8a-tech/wt';
import type { ConsentMapping, Destination, Settings } from './types';
import { getData, normalizeEventName } from './mapping';

export * as DestinationD8a from './types';

const DEFAULT_GLOBAL_NAME = 'd8a';
const DEFAULT_DATA_LAYER_NAME = 'd8aLayer';

let defaultConsentSet = false;

export function resetConsentState(): void {
  defaultConsentSet = false;
}

function getD8a(
  windowRef: Window & Record<string, unknown>,
  name: string,
): D8aFn {
  return windowRef[name] as D8aFn;
}

/** The installed d8a function, or a StepError when it is not there. */
function requireD8a(
  windowRef: Window & Record<string, unknown>,
  name: string,
): D8aFn {
  const d8a = getD8a(windowRef, name);
  if (typeof d8a !== 'function')
    throw new StepError(`d8a not ready: window.${name} is missing`, {
      code: 'vendor-not-ready',
    });
  return d8a;
}

function buildConfigParams(settings: Partial<Settings>): D8aConfigParams {
  const {
    property_id: _property_id,
    como: _como,
    data: _data,
    dataLayerName: _dataLayerName,
    globalName: _globalName,
    snakeCase: _snakeCase,
    ...configParams
  } = settings;

  return { ...configParams };
}

export const destinationD8a: Destination = {
  type: 'd8a',

  config: { settings: {} },

  async init({ config, env }) {
    const settings = config.settings || {};
    const { property_id, server_container_url } = settings;

    const missing = [
      ...(property_id ? [] : ['settings.property_id']),
      ...(server_container_url ? [] : ['settings.server_container_url']),
    ];
    if (missing.length)
      throw new StepError(`d8a needs ${missing.join(' and ')}`, {
        code: 'config',
      });

    const { window } = getEnv(env);
    const globalName = settings.globalName || DEFAULT_GLOBAL_NAME;
    const dataLayerName = settings.dataLayerName || DEFAULT_DATA_LAYER_NAME;
    const installD8aFn = env?.installD8a || installD8a;

    installD8aFn({
      windowRef: window,
      globalName,
      dataLayerName,
    });

    const d8a = requireD8a(
      window as Window & Record<string, unknown>,
      globalName,
    );
    await stepCall(
      () => d8a('js', new Date()),
      'vendor-not-ready',
      'd8a init call failed',
    );
    await stepCall(
      () => d8a('config', property_id, buildConfigParams(settings)),
      'vendor-not-ready',
      'd8a config call failed',
    );

    return config;
  },

  async push(event, { config, rule, data, env, collector }) {
    // A silent rule sends no d8a event
    if (!rule?.silent) {
      const settings = config.settings || {};
      const eventData = await getData(
        event,
        data as WalkerOS.AnyObject,
        config,
        settings,
        collector,
      );
      const eventParams = isObject(eventData)
        ? { ...(eventData as Record<string, unknown>) }
        : {};

      eventParams.send_to = settings.property_id;

      const eventName = normalizeEventName(
        event.name,
        settings.snakeCase !== false,
      );
      const { window } = getEnv(env);
      const globalName = settings.globalName || DEFAULT_GLOBAL_NAME;
      const d8a = requireD8a(
        window as Window & Record<string, unknown>,
        globalName,
      );

      await stepCall(
        () => d8a('event', eventName, eventParams),
        'transport',
        'd8a event call failed',
      );
    }
  },

  async on(type, context) {
    if (type !== 'consent' || !context.data) return;

    const settings = (context.config?.settings || {}) as Partial<Settings>;
    const { como = true } = settings;
    if (!como) return;

    const { window } = getEnv(context.env);
    const globalName = settings.globalName || DEFAULT_GLOBAL_NAME;
    const d8a = getD8a(window as Window & Record<string, unknown>, globalName);
    if (!d8a) return;

    const consent = context.data as WalkerOS.Consent;
    const consentMapping: ConsentMapping =
      como === true ? DEFAULT_CONSENT_MODE_MAPPING : como;

    if (!defaultConsentSet) {
      const allParams = consentModeParameters(consentMapping);

      if (allParams.length > 0) {
        const defaultConsent: Record<string, 'denied'> = {};
        allParams.forEach((param) => {
          defaultConsent[param] = 'denied';
        });
        await stepCall(
          () => d8a('consent', 'default', defaultConsent),
          'consent-not-applied',
          'd8a did not take the consent default',
        );
      }

      defaultConsentSet = true;
    }

    // The command carries only the changed groups; a parameter is decided
    // from the whole consent state, granted only when every group mapped to
    // it is granted.
    const d8aConsent = resolveConsentMode(
      consentMapping,
      { ...context.collector.consent, ...consent },
      consent,
    );

    if (Object.keys(d8aConsent).length === 0) return;

    await stepCall(
      () => d8a('consent', 'update', d8aConsent),
      'consent-not-applied',
      'd8a did not take the consent update',
    );
  },
};

export default destinationD8a;
