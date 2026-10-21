import {
  getMappingValue,
  isObject,
  isString,
  StepError,
  stepCall,
} from '@walkeros/core';
import Hotjar from '@hotjar/browser';
import type { HotjarSDK, Destination, Env, Mapping, Settings } from './types';

// Types export
export * as DestinationHotjar from './types';

/**
 * Resolve the Hotjar SDK: use the caller-provided mock when available
 * (tests), otherwise fall back to the real `@hotjar/browser` default export.
 */
function getHotjar(env: Env | undefined): HotjarSDK {
  return env?.hotjar ?? (Hotjar as unknown as HotjarSDK);
}

/**
 * Runs one Hotjar call. The SDK reports failure by returning `false` (and
 * logging to the console), so a `false` fails like a throw.
 */
const call = (fn: () => unknown, code: string, message: string) =>
  stepCall(
    async () => {
      if ((await fn()) === false) throw new StepError(message, { code });
    },
    code,
    message,
  );

export const destinationHotjar: Destination = {
  type: 'hotjar',

  config: {},

  async init({ config, env }) {
    const settings = config.settings;
    if (!settings?.siteId)
      throw new StepError('Hotjar needs settings.siteId', { code: 'config' });

    const hotjarVersion = settings.hotjarVersion ?? 6;
    const opts: { debug?: boolean; nonce?: string } = {};
    if (settings.debug !== undefined) opts.debug = settings.debug;
    if (settings.nonce !== undefined) opts.nonce = settings.nonce;

    const { siteId } = settings;
    await call(
      () =>
        getHotjar(env).init(
          siteId,
          hotjarVersion,
          Object.keys(opts).length > 0 ? opts : undefined,
        ),
      'vendor-not-ready',
      'Hotjar init failed',
    );

    return config;
  },

  async push(event, { config, rule, env, collector }) {
    const hotjar = getHotjar(env as Env | undefined);
    const settings = (config.settings || {}) as Partial<Settings>;
    const mappingSettings = (rule?.settings || {}) as Mapping;

    // 1. Identify -- rule-level override wins over destination-level.
    //    Fires first per Hotjar's guidance so subsequent event calls
    //    are associated with the right user.
    const identifyMapping = mappingSettings.identify ?? settings.identify;
    if (identifyMapping !== undefined) {
      const resolved = await getMappingValue(event, identifyMapping, {
        collector,
      });
      if (isObject(resolved)) {
        const { userId, ...attributes } = resolved as Record<string, unknown>;
        if (isString(userId) && userId) {
          // Build typed user attributes, filtering out non-primitive values
          const userInfo: Record<string, string | number | boolean> = {};
          for (const [key, val] of Object.entries(attributes)) {
            if (
              isString(val) ||
              typeof val === 'number' ||
              typeof val === 'boolean'
            ) {
              userInfo[key] = val;
            }
          }
          await call(
            () => hotjar.identify(userId, userInfo),
            'transport',
            'Hotjar identify failed',
          );
        }
      }
    }

    // 2. SPA state change -- stateChange mapping resolves to path string.
    if (mappingSettings.stateChange !== undefined) {
      const resolved = await getMappingValue(
        event,
        mappingSettings.stateChange,
        { collector },
      );
      if (isString(resolved) && resolved) {
        await call(
          () => hotjar.stateChange(resolved),
          'transport',
          'Hotjar stateChange failed',
        );
      }
    }

    // 3. Default event forwarding -- unless rule.silent is set
    if (rule?.silent !== true) {
      const eventName = isString(rule?.name) ? rule.name : event.name;
      await call(
        () => hotjar.event(eventName),
        'transport',
        'Hotjar event failed',
      );
    }

    // A silent rule whose identify or stateChange resolves nothing sends
    // nothing: a declared skip, not a failure.
  },
};

export default destinationHotjar;
