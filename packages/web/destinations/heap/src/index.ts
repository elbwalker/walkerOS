import type { DestinationWeb } from '@walkeros/web-core';
import { getMappingValue, isObject, isString } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';
import type {
  Destination,
  Env,
  HeapConfig,
  HeapPropertyValue,
  HeapSDK,
  Mapping,
  Settings,
} from './types';

// Types export
export * as DestinationHeap from './types';

/**
 * Resolve the Heap SDK: prefer the caller-provided mock (tests) via
 * env.window.heap, otherwise fall back to the global window.heap the
 * init function established (real snippet command queue).
 */
function getHeap(env: Env | undefined): HeapSDK | undefined {
  if (env?.window?.heap) return env.window.heap;
  const { window } = getEnv(env as DestinationWeb.Env | undefined);
  return (window as Window).heap;
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

export const destinationHeap: Destination = {
  type: 'heap',

  config: {},

  init({ config, env }) {
    const settings = config.settings;
    if (!settings?.appId) return false;

    // In tests a mock is provided via env.window.heap and there's nothing
    // for us to bootstrap. In production we install the Heap snippet's
    // command queue and call heap.load().
    if (env?.window?.heap) return config;

    const { window, document } = getEnv(env as DestinationWeb.Env | undefined);
    const w = window as Window;
    const doc = document as Document;

    const heapConfig: HeapConfig = {
      disableTextCapture: settings.disableTextCapture ?? true,
      disablePageviewAutocapture: settings.disablePageviewAutocapture ?? true,
      ...(settings.disableSessionReplay !== undefined && {
        disableSessionReplay: settings.disableSessionReplay,
      }),
      ...(settings.secureCookie !== undefined && {
        secureCookie: settings.secureCookie,
      }),
      ...(settings.ingestServer !== undefined && {
        ingestServer: settings.ingestServer,
      }),
      ...settings.heapConfig,
    };

    // Install the Heap snippet's command queue if not already present.
    if (!w.heap) {
      const heap: HeapSDK = {
        load: (appId: string, cfg?: HeapConfig) => {
          heap.appid = appId;
          heap.config = cfg ?? {};
        },
        track: (() => undefined) as HeapSDK['track'],
        identify: (() => undefined) as HeapSDK['identify'],
        resetIdentity: () => undefined,
        addUserProperties: (() => undefined) as HeapSDK['addUserProperties'],
        addEventProperties: (() => undefined) as HeapSDK['addEventProperties'],
        clearEventProperties: () => undefined,
        startTracking: () => undefined,
        stopTracking: () => undefined,
        q: [],
      };

      // Queue all calls until the real snippet boots and replaces these.
      const methods: Array<keyof HeapSDK> = [
        'addEventProperties',
        'addUserProperties',
        'clearEventProperties',
        'identify',
        'resetIdentity',
        'track',
        'startTracking',
        'stopTracking',
      ];
      for (const method of methods) {
        const queue = (...args: unknown[]) => {
          heap.q = heap.q || [];
          heap.q.push([method, ...args]);
        };
        (heap as unknown as Record<string, (...args: unknown[]) => void>)[
          method as string
        ] = queue;
      }

      w.heap = heap;
    }

    // Load real snippet script unless disabled.
    if (config.loadScript) addScript(settings.appId, doc);

    const heap = w.heap as HeapSDK;
    if (!heap.appid) heap.load(settings.appId, heapConfig);

    return config;
  },

  async push(event, { config, data, env, rule, collector }) {
    const heap = getHeap(env as Env | undefined);
    if (!heap) return;

    const settings = (config.settings || {}) as Partial<Settings>;
    const mappingSettings = (rule?.settings || {}) as Mapping;

    // 1. Reset identity first — subsequent identify/userProperties
    //    operate on the fresh anonymous user.
    if (mappingSettings.reset !== undefined) {
      const resolved =
        typeof mappingSettings.reset === 'boolean'
          ? mappingSettings.reset
          : await getMappingValue(event, mappingSettings.reset, { collector });
      if (resolved) heap.resetIdentity();
    }

    // 2. Identify — rule-level wins over destination-level.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      if (isString(resolved) && resolved.length > 0) {
        heap.identify(resolved);
      }
    }

    // 3. User properties — rule-level wins over destination-level.
    const userPropsMapping =
      mappingSettings.userProperties ?? settings.userProperties;
    if (userPropsMapping !== undefined) {
      const resolved = await getMappingValue(event, userPropsMapping, {
        collector,
      });
      if (isObject(resolved)) {
        heap.addUserProperties(toHeapProperties(resolved));
      }
    }

    // 4. Persistent event properties.
    if (mappingSettings.eventProperties !== undefined) {
      const resolved = await getMappingValue(
        event,
        mappingSettings.eventProperties,
        { collector },
      );
      if (isObject(resolved)) {
        heap.addEventProperties(toHeapProperties(resolved));
      }
    }

    // 5. Clear persistent event properties.
    if (mappingSettings.clearEventProperties !== undefined) {
      const resolved =
        typeof mappingSettings.clearEventProperties === 'boolean'
          ? mappingSettings.clearEventProperties
          : await getMappingValue(event, mappingSettings.clearEventProperties, {
              collector,
            });
      if (resolved) heap.clearEventProperties();
    }

    // 6. Default track — unless rule.skip is set.
    if (rule?.skip !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      const properties = toHeapProperties(data);
      heap.track(eventName, properties);
    }
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;

    const heap = getHeap(context.env as Env | undefined);
    if (!heap) return;

    const required = context.config?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const consent = context.data as Record<string, boolean>;
    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );

    if (allGranted) heap.startTracking();
    else heap.stopTracking();
  },
};

function addScript(appId: string, doc: Document) {
  const script = doc.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = `https://cdn.heapanalytics.com/js/heap-${appId}.js`;
  const firstScript = doc.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    doc.head.appendChild(script);
  }
}

export default destinationHeap;
