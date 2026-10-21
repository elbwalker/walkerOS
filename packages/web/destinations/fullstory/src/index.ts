import type { Logger, WalkerOS } from '@walkeros/core';
import {
  getGrantedConsent,
  getMappingValue,
  isObject,
  isString,
  StepError,
  stepCall,
} from '@walkeros/core';
import { init as fsInit, FullStory } from '@fullstory/browser';
import type { Destination, FullStorySDK, Mapping, Settings } from './types';

// Types export
export * as DestinationFullStory from './types';

type InitOptions = Parameters<FullStorySDK['init']>[0];

/** The real @fullstory/browser functions. */
const realFS: FullStorySDK = {
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

function isFullStorySDK(value: unknown): value is FullStorySDK {
  return (
    isObject(value) &&
    [
      'init',
      'trackEvent',
      'setIdentity',
      'setProperties',
      'shutdown',
      'start',
    ].every((key) => typeof value[key] === 'function')
  );
}

/**
 * Resolve the FullStory SDK: use the caller-provided mock when available
 * (tests), otherwise fall back to the real @fullstory/browser functions.
 */
function getFS(env: unknown): FullStorySDK {
  const mock = isObject(env) ? env.fullstory : undefined;
  if (mock === undefined) return realFS;
  if (isFullStorySDK(mock)) return mock;
  throw new StepError('env.fullstory is not a FullStory SDK', {
    code: 'config',
  });
}

/** The SDK's init options from the settings. */
function initOptions(settings: unknown): InitOptions | undefined {
  if (!isObject(settings) || !isString(settings.orgId) || !settings.orgId)
    return undefined;
  const options: InitOptions = { orgId: settings.orgId };
  if (isString(settings.host)) options.host = settings.host;
  if (isString(settings.script)) options.script = settings.script;
  if (isString(settings.cookieDomain))
    options.cookieDomain = settings.cookieDomain;
  if (typeof settings.debug === 'boolean') options.debug = settings.debug;
  if (typeof settings.devMode === 'boolean') options.devMode = settings.devMode;
  if (typeof settings.startCaptureManually === 'boolean')
    options.startCaptureManually = settings.startCaptureManually;
  if (isString(settings.namespace)) options.namespace = settings.namespace;
  if (typeof settings.recordCrossDomainIFrames === 'boolean')
    options.recordCrossDomainIFrames = settings.recordCrossDomainIFrames;
  return options;
}

const send = (fn: () => unknown) =>
  stepCall(fn, 'transport', 'FullStory call failed');

/** The calls a consent change makes, or none. */
function consentCalls(
  fs: FullStorySDK,
  settings: unknown,
  required: WalkerOS.Consent | undefined,
  change: Record<string, unknown>,
  state: WalkerOS.Consent,
): Array<() => unknown> {
  const consentMap = isObject(settings) ? settings.consent : undefined;
  if (isObject(consentMap)) {
    // The explicit translation: each mapped key present in the change.
    return Object.entries(consentMap).flatMap(([walkerKey, fsAction]) => {
      if (!(walkerKey in change)) return [];
      const granted = change[walkerKey] === true;
      if (fsAction === 'capture')
        return [() => (granted ? fs.start() : fs.shutdown())];
      if (fsAction === 'consent')
        return [() => fs.setIdentity({ consent: granted })];
      return [];
    });
  }

  // Without a translation the destination's required consent decides, as it
  // gates the pushes: capture starts on a grant and stops on a revocation.
  if (!required || !Object.keys(required).some((key) => key in change))
    return [];
  const granted = getGrantedConsent(required, state) !== false;
  return [() => (granted ? fs.start() : fs.shutdown())];
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
  logger.debug(`FullStory skipped ${call}: ${key} resolved to nothing`, {
    event: event.name,
  });
}

export const destinationFullStory: Destination = {
  type: 'fullstory',

  config: {},

  // FullStory starts in init, so recording begins at page load.
  async init({ config, env }) {
    const options = initOptions(config.settings);
    if (!options)
      throw new StepError('FullStory needs settings.orgId', {
        code: 'config',
      });
    await stepCall(
      () => getFS(env).init(options),
      'vendor-not-ready',
      'FullStory init failed',
    );
  },

  async push(event, { config, rule, env, data, collector, logger }) {
    const fs = getFS(env);
    const settings: Partial<Settings> = config.settings || {};
    const mappingSettings: Mapping = rule?.settings || {};

    // 1. Identify -- rule-level override wins over destination-level.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      const { uid, properties } = isObject(resolved) ? resolved : {};
      if (isString(uid) && uid) {
        const identityOpts: {
          uid: string;
          properties?: Record<string, unknown>;
        } = { uid };
        if (isObject(properties)) identityOpts.properties = properties;
        await send(() => fs.setIdentity(identityOpts));
      } else skipped(logger, event, 'setIdentity', 'identify');
    }

    // 2. setProperties -- user or page scope
    if (mappingSettings.set !== undefined) {
      const resolved = await getMappingValue(event, mappingSettings.set, {
        collector,
      });
      if (isObject(resolved) && Object.keys(resolved).length) {
        const propertyType = mappingSettings.setType || 'user';
        await send(() =>
          fs.setProperties({ type: propertyType, properties: resolved }),
        );
      } else skipped(logger, event, 'setProperties', 'set');
    }

    // 3. Default trackEvent -- unless rule.silent is set
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = isObject(data) ? data : {};
      await send(() => fs.trackEvent({ name: eventName, properties }));
    }

    // A silent rule whose settings resolve nothing sends nothing: a
    // declared skip, not a failure.
  },

  async on(type, { config, data, env, collector }) {
    if (type !== 'consent' || !isObject(data)) return;
    const calls = consentCalls(
      getFS(env),
      config.settings,
      config.consent,
      data,
      collector.consent,
    );

    for (const fn of calls)
      await stepCall(
        fn,
        'consent-not-applied',
        'FullStory did not take the consent update',
      );
  },
};

export default destinationFullStory;
