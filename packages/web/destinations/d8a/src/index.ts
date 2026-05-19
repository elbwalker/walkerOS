import type { WalkerOS } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import type { D8aConfigParams, D8aFn } from '@d8a-tech/wt';
import { installD8a } from '@d8a-tech/wt';
import type { ConsentMapping, Destination, Settings } from './types';
import { getData, normalizeEventName } from './mapping';

export * as DestinationD8a from './types';

const DEFAULT_GLOBAL_NAME = 'd8a';
const DEFAULT_DATA_LAYER_NAME = 'd8aLayer';

const DEFAULT_CONSENT_MAPPING: ConsentMapping = {
  marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
  functional: 'analytics_storage',
};

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

  async init({ config, env, logger }) {
    const settings = config.settings || {};
    const { property_id, server_container_url } = settings;

    if (!property_id) logger.throw('Config settings property_id missing');
    if (!server_container_url)
      logger.throw('Config settings server_container_url missing');

    const { window } = getEnv(env);
    const globalName = settings.globalName || DEFAULT_GLOBAL_NAME;
    const dataLayerName = settings.dataLayerName || DEFAULT_DATA_LAYER_NAME;
    const installD8aFn = env?.installD8a || installD8a;

    installD8aFn({
      windowRef: window,
      globalName,
      dataLayerName,
    });

    const d8a = getD8a(window as Window & Record<string, unknown>, globalName);
    d8a('js', new Date());
    d8a('config', property_id, buildConfigParams(settings));

    return config;
  },

  async push(event, { config, data, env, collector }) {
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
    const d8a = getD8a(window as Window & Record<string, unknown>, globalName);

    d8a('event', eventName, eventParams);
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;

    const settings = (context.config?.settings || {}) as Partial<Settings>;
    const { como = true } = settings;
    if (!como) return;

    const { window } = getEnv(context.env);
    const globalName = settings.globalName || DEFAULT_GLOBAL_NAME;
    const d8a = getD8a(window as Window & Record<string, unknown>, globalName);
    if (!d8a) return;

    const consent = context.data as WalkerOS.Consent;
    const consentMapping = como === true ? DEFAULT_CONSENT_MAPPING : como;

    if (!defaultConsentSet) {
      const allParams = new Set<string>();
      Object.values(consentMapping).forEach((params) => {
        const paramArray = Array.isArray(params) ? params : [params];
        paramArray.forEach((param) => allParams.add(param));
      });

      if (allParams.size > 0) {
        const defaultConsent: Record<string, 'denied'> = {};
        allParams.forEach((param) => {
          defaultConsent[param] = 'denied';
        });
        d8a('consent', 'default', defaultConsent);
      }

      defaultConsentSet = true;
    }

    const d8aConsent: Record<string, 'granted' | 'denied'> = {};
    Object.entries(consent).forEach(([walkerOSGroup, granted]) => {
      const d8aParams = consentMapping[walkerOSGroup];
      if (!d8aParams) return;

      const params = Array.isArray(d8aParams) ? d8aParams : [d8aParams];
      const consentValue = granted ? 'granted' : 'denied';
      params.forEach((param) => {
        d8aConsent[param] = consentValue;
      });
    });

    if (Object.keys(d8aConsent).length === 0) return;

    d8a('consent', 'update', d8aConsent);
  },
};

export default destinationD8a;
