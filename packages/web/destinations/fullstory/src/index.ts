import type { WalkerOS } from '@walkeros/core';
import { getMappingValue, isObject, isString } from '@walkeros/core';
import { init as fsInit, FullStory } from '@fullstory/browser';
import type {
  Destination,
  Env,
  FullStorySDK,
  Mapping,
  Settings,
} from './types';

// Types export
export * as DestinationFullStory from './types';

/**
 * Resolve the FullStory SDK: use the caller-provided mock when available
 * (tests), otherwise fall back to the real @fullstory/browser functions.
 */
function getFS(env: Env | undefined): FullStorySDK {
  if (env?.fullstory) return env.fullstory;
  return {
    init: fsInit,
    trackEvent: (opts) =>
      FullStory('trackEvent', {
        name: opts.name,
        properties: opts.properties ?? {},
      }),
    setIdentity: (opts) => FullStory('setIdentity', opts),
    setProperties: (opts) => FullStory('setProperties', opts),
    shutdown: () => FullStory('shutdown'),
    start: () => FullStory('start'),
  };
}

export const destinationFullStory: Destination = {
  type: 'fullstory',

  config: {},

  init({ config, env }) {
    const settings = config.settings;
    if (!settings?.orgId) return false;

    const fs = getFS(env as Env | undefined);
    const initOpts: Parameters<FullStorySDK['init']>[0] = {
      orgId: settings.orgId,
    };
    if (settings.host !== undefined) initOpts.host = settings.host;
    if (settings.script !== undefined) initOpts.script = settings.script;
    if (settings.cookieDomain !== undefined)
      initOpts.cookieDomain = settings.cookieDomain;
    if (settings.debug !== undefined) initOpts.debug = settings.debug;
    if (settings.devMode !== undefined) initOpts.devMode = settings.devMode;
    if (settings.startCaptureManually !== undefined)
      initOpts.startCaptureManually = settings.startCaptureManually;
    if (settings.namespace !== undefined)
      initOpts.namespace = settings.namespace;
    if (settings.recordCrossDomainIFrames !== undefined)
      initOpts.recordCrossDomainIFrames = settings.recordCrossDomainIFrames;
    fs.init(initOpts);

    return config;
  },

  async push(event, { config, rule, env, data, collector }) {
    const fs = getFS(env as Env | undefined);
    const settings = (config.settings || {}) as Partial<Settings>;
    const mappingSettings = (rule?.settings || {}) as Mapping;

    // 1. Identify -- rule-level override wins over destination-level.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      if (isObject(resolved)) {
        const { uid, properties } = resolved as {
          uid?: unknown;
          properties?: unknown;
        };
        if (isString(uid) && uid) {
          const identityOpts: {
            uid: string;
            properties?: Record<string, unknown>;
          } = { uid };
          if (isObject(properties)) {
            identityOpts.properties = properties as Record<string, unknown>;
          }
          fs.setIdentity(identityOpts);
        }
      }
    }

    // 2. setProperties -- user or page scope
    if (mappingSettings.set !== undefined) {
      const resolved = await getMappingValue(event, mappingSettings.set, {
        collector,
      });
      if (isObject(resolved)) {
        const propertyType = mappingSettings.setType || 'user';
        fs.setProperties({
          type: propertyType,
          properties: resolved as Record<string, unknown>,
        });
      }
    }

    // 3. Default trackEvent -- unless rule.silent is set
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = isObject(data)
        ? (data as Record<string, unknown>)
        : {};
      fs.trackEvent({ name: eventName, properties });
    }
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;
    const fs = getFS(context.env as Env | undefined);

    const consent = context.data as WalkerOS.Consent;
    const settings = (context.config?.settings || {}) as Partial<Settings>;
    const consentMap = settings.consent;
    if (!consentMap) return;

    for (const [walkerKey, fsAction] of Object.entries(consentMap)) {
      if (!(walkerKey in consent)) continue;
      const granted = consent[walkerKey] === true;

      if (fsAction === 'capture') {
        if (granted) {
          fs.start();
        } else {
          fs.shutdown();
        }
      } else if (fsAction === 'consent') {
        fs.setIdentity({ consent: granted });
      }
    }
  },
};

export default destinationFullStory;
