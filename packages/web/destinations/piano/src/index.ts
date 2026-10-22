import type { Config, Env, Destination, PianoAnalytics } from './types';
import { isObject, StepError, stepCall } from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';

// Types
export * as DestinationPiano from './types';

const SCRIPT_SRC = 'https://tag.aticdn.net/piano-analytics.js';

/**
 * The Piano SDK. It has no stub that replays calls, so a push waits for the
 * script `loadVendor` injected (`loadScript`), or finds `pa` on the page.
 */
function vendor(config: Config, env?: Env) {
  return loadVendor(
    config.loadScript ? SCRIPT_SRC : undefined,
    () => resolvePa(env),
    { timeout: config.timeout, document: getEnv(env).document },
  );
}

// SDK instances already configured, so setConfigurations runs once each.
const configured = new WeakSet<PianoAnalytics>();

export const destinationPiano: Destination = {
  type: 'piano',

  config: {},

  init({ config, env }) {
    const { site, collectDomain } = config.settings || {};
    const missing = [
      site === undefined ? 'site' : undefined,
      !collectDomain ? 'collectDomain' : undefined,
    ].filter((key) => key !== undefined);
    if (missing.length)
      throw new StepError(
        `Piano Analytics needs settings ${missing.join(' and ')}`,
        { code: 'config' },
      );

    vendor(config, env);
  },

  async push(event, { config, data, env, rule }) {
    const pa = await vendor(config, env).ready();
    const settings = config.settings;

    await stepCall(
      async () => {
        if (settings && !configured.has(pa)) {
          await pa.setConfigurations({
            site: settings.site,
            collectDomain: settings.collectDomain,
            ...(isObject(settings.options) ? settings.options : {}),
          });
          configured.add(pa);
        }

        if (!rule?.silent)
          await pa.sendEvent(event.name, isObject(data) ? data : {});
      },
      'transport',
      'Piano Analytics call failed',
    );
  },
};

/**
 * Resolve the Piano `pa` SDK without casts: prefer the injected env (tests,
 * simulation), fall back to the browser global declared on `Window`.
 */
function resolvePa(env?: Env): PianoAnalytics | undefined {
  return (
    env?.window?.pa ?? (typeof window !== 'undefined' ? window.pa : undefined)
  );
}

export default destinationPiano;
