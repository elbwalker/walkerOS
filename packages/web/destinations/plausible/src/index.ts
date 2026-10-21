import type { Config, Destination, Env } from './types';
import { isObject, StepError } from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';

// Types
export * as DestinationPlausible from './types';

const SCRIPT_SRC = 'https://plausible.io/js/script.manual.js';

export const destinationPlausible: Destination = {
  type: 'plausible',

  config: {},

  init({ config, env }) {
    const { window } = getEnv<Env>(env);
    const settings = config.settings || {};

    vendor(config, settings.domain, env);

    window.plausible =
      window.plausible ||
      function () {
        (window.plausible!.q = window.plausible!.q || []).push(arguments);
      };

    return config;
  },

  async push(event, { config, rule, data, env }) {
    vendor(config, config.settings?.domain, env).check();

    const { window } = getEnv<Env>(env);
    const { plausible } = window;
    if (!plausible)
      throw new StepError('Plausible not ready: window.plausible is missing', {
        code: 'vendor-not-ready',
      });

    // A silent rule sends no Plausible event
    if (!rule?.silent) {
      const params = isObject(data) ? data : {};
      try {
        await plausible(`${event.name}`, params);
      } catch (error) {
        throw new StepError('Plausible call failed', {
          code: 'transport',
          cause: error,
        });
      }
    }
  },
};

/**
 * The script `loadVendor` injects with `loadScript`. plausible replays its own
 * queue, so it is called synchronously and only a failed script is reported.
 */
function vendor(
  config: { loadScript?: boolean; timeout?: number },
  domain: string | undefined,
  env?: Env,
) {
  return loadVendor(
    config.loadScript ? SCRIPT_SRC : undefined,
    () => getEnv<Env>(env).window.plausible,
    {
      timeout: config.timeout,
      attributes: domain ? { 'data-domain': domain } : undefined,
    },
  );
}

export default destinationPlausible;
