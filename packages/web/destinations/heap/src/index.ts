import {
  getGrantedConsent,
  getMappingValue,
  isObject,
  isString,
  StepError,
  stepCall,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
import { getEnv, loadVendor } from '@walkeros/web-core';
import type {
  Destination,
  HeapConfig,
  HeapPropertyValue,
  HeapSDK,
  Mapping,
  Settings,
} from './types';

// Types export
export * as DestinationHeap from './types';

/** The classic Heap SDK `loadScript` loads. */
const scriptSrc = (appId: string) =>
  `https://cdn.heapanalytics.com/js/heap-${appId}.js`;

function isHeapSDK(value: unknown): value is HeapSDK {
  return (
    isObject(value) &&
    [
      'track',
      'identify',
      'resetIdentity',
      'addUserProperties',
      'addEventProperties',
      'clearEventProperties',
    ].every((key) => typeof value[key] === 'function')
  );
}

/**
 * The Heap SDK: the caller-provided mock (tests) via env.window.heap,
 * otherwise window.heap once it is the SDK (the page's snippet or the
 * loaded classic SDK), never the loader object init leaves there.
 */
function getHeap(env: unknown): HeapSDK | undefined {
  const mock =
    isObject(env) && isObject(env.window) ? env.window.heap : undefined;
  if (isHeapSDK(mock)) return mock;
  const { heap } = getEnv().window;
  return isHeapSDK(heap) ? heap : undefined;
}

/**
 * The classic SDK replays no object stub, so a push waits until the script
 * `loadVendor` injected (`loadScript`) has loaded; without it the page loads
 * Heap and each push finds it or fails `vendor-not-ready`.
 */
function vendor(
  appId: string | undefined,
  loadScript: boolean | undefined,
  env: DestinationWeb.Env | undefined,
  timeout?: number,
) {
  return loadVendor(
    loadScript && appId ? scriptSrc(appId) : undefined,
    () => getHeap(env),
    { timeout, document: getEnv(env).document },
  );
}

/**
 * Coerce a resolved object into a flat { key: primitive } map suitable
 * for Heap's property APIs. Drops non-primitive values.
 */
function toHeapProperties(value: unknown): Record<string, HeapPropertyValue> {
  const out: Record<string, HeapPropertyValue> = {};
  if (!isObject(value)) return out;
  for (const [key, val] of Object.entries(value)) {
    if (
      typeof val === 'string' ||
      typeof val === 'number' ||
      typeof val === 'boolean'
    ) {
      out[key] = val;
    }
  }
  return out;
}

const send = (fn: () => unknown) =>
  stepCall(fn, 'transport', 'Heap call failed');

export const destinationHeap: Destination = {
  type: 'heap',

  config: {},

  init({ config, env }) {
    const settings = config.settings;
    if (!settings?.appId)
      throw new StepError('Heap needs settings.appId', { code: 'config' });

    if (config.loadScript) {
      // The classic SDK reads appid and config from window.heap on load.
      const heapConfig: HeapConfig = {
        disableTextCapture: settings.disableTextCapture ?? true,
        ...(settings.secureCookie !== undefined && {
          secureCookie: settings.secureCookie,
        }),
        ...settings.heapConfig,
      };
      const { window } = getEnv();
      if (!window.heap)
        window.heap = { appid: settings.appId, config: heapConfig };
    }

    vendor(settings.appId, config.loadScript, env, config.timeout);
  },

  async push(event, { config, data, env, rule, collector }) {
    const settings: Partial<Settings> = config.settings || {};
    const heap = await vendor(
      settings.appId,
      config.loadScript,
      env,
      config.timeout,
    ).ready();
    const mappingSettings: Mapping = rule?.settings || {};

    // 1. Reset identity first - subsequent identify/userProperties
    //    operate on the fresh anonymous user.
    if (mappingSettings.reset !== undefined) {
      const resolved =
        typeof mappingSettings.reset === 'boolean'
          ? mappingSettings.reset
          : await getMappingValue(event, mappingSettings.reset, { collector });
      if (resolved) await send(() => heap.resetIdentity());
    }

    // 2. Identify - rule-level wins over destination-level.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      if (isString(resolved) && resolved.length > 0)
        await send(() => heap.identify(resolved));
    }

    // 3. User properties - rule-level wins over destination-level.
    const userPropsMapping =
      mappingSettings.userProperties ?? settings.userProperties;
    if (userPropsMapping !== undefined) {
      const resolved = await getMappingValue(event, userPropsMapping, {
        collector,
      });
      if (isObject(resolved))
        await send(() => heap.addUserProperties(toHeapProperties(resolved)));
    }

    // 4. Persistent event properties.
    if (mappingSettings.eventProperties !== undefined) {
      const resolved = await getMappingValue(
        event,
        mappingSettings.eventProperties,
        { collector },
      );
      if (isObject(resolved))
        await send(() => heap.addEventProperties(toHeapProperties(resolved)));
    }

    // 5. Clear persistent event properties.
    if (mappingSettings.clearEventProperties !== undefined) {
      const resolved =
        typeof mappingSettings.clearEventProperties === 'boolean'
          ? mappingSettings.clearEventProperties
          : await getMappingValue(event, mappingSettings.clearEventProperties, {
              collector,
            });
      if (resolved) await send(() => heap.clearEventProperties());
    }

    // 6. Default track - unless rule.silent is set.
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = toHeapProperties(data);
      await send(() => heap.track(eventName, properties));
    }
  },

  // The destination's required consent decides, as it gates the pushes. The
  // call waits for the loaded SDK; the classic SDK has no tracking switch, so
  // a revocation there stops only the pushes.
  async on(type, { config, data, env, collector }) {
    const required = config.consent;
    if (type !== 'consent' || !required || !isObject(data)) return;
    if (!Object.keys(required).some((key) => key in data)) return;
    const granted = getGrantedConsent(required, collector.consent) !== false;

    const settings = isObject(config.settings) ? config.settings : {};
    const appId = isString(settings.appId) ? settings.appId : undefined;
    const heap = await vendor(appId, config.loadScript, env, config.timeout)
      .ready()
      .catch(() => undefined);
    // Without a loaded Heap nothing collects, so there is nothing to tell.
    if (!heap) return;

    const toggle = granted ? heap.startTracking : heap.stopTracking;
    if (!toggle) return;
    await stepCall(
      () => toggle.call(heap),
      'consent-not-applied',
      'Heap did not take the consent update',
    );
  },
};

export default destinationHeap;
