import type { Config, Destination, Env } from './types';
import { SCRIPT_SRC, setup } from './setup';
import { getGrantedConsent, isObject, StepError } from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';

// Types
export * as DestinationMeta from './types';

/**
 * The script `loadVendor` injects with `loadScript`. fbq replays its own stub,
 * so it is called synchronously and only a failed script is reported.
 */
function vendor(config: Config, env?: Env) {
  return loadVendor(
    config.loadScript ? SCRIPT_SRC : undefined,
    () => getEnv<Env>(env).window.fbq,
    { timeout: config.timeout },
  );
}

/** The fbq stub or library, or a StepError when it is not there. */
function pixel(env?: Env): facebook.Pixel.Event {
  const { fbq } = getEnv<Env>(env).window;
  if (!fbq)
    throw new StepError('Meta Pixel not ready: window.fbq is missing', {
      code: 'vendor-not-ready',
    });
  return fbq;
}

/** Runs one fbq call; a throw or a rejection becomes a StepError of `code`. */
async function call(
  fn: () => unknown,
  code: string,
  message: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new StepError(message, { code, cause: error });
  }
}

export const destinationMeta: Destination = {
  type: 'meta-pixel',

  config: {},

  async init({ config, env }) {
    const { pixelId } = config.settings || {};
    if (!pixelId)
      throw new StepError('Meta Pixel needs settings.pixelId', {
        code: 'config',
      });

    // The fbq stub first, so calls queue until fbevents.js replays them
    setup(env);
    vendor(config, env);

    const fbq = pixel(env);
    await call(
      () => fbq('init', pixelId),
      'vendor-not-ready',
      'Meta Pixel init call failed',
    );
  },

  async push(event, { config, rule = {}, data, env }) {
    vendor(config, env).check();
    const fbq = pixel(env);
    const { track, trackCustom } = rule.settings || {};

    // page view
    if (event.name === 'page view' && !rule.settings) {
      // Define a custom mapping
      event.name = 'PageView';
    }

    const eventName = track || trackCustom || event.name;

    if (!rule.silent)
      await call(
        () =>
          fbq(
            trackCustom ? 'trackCustom' : 'track',
            String(eventName),
            isObject(data) ? data : {},
            { eventID: event.id },
          ),
        'transport',
        'Meta Pixel call failed',
      );
  },

  // The destination's required consent decides, as it gates the pushes: a
  // revocation pauses the pixel's own fires, a grant resumes them.
  async on(type, { config, data, env, collector }) {
    const required = config.consent;
    if (type !== 'consent' || !required || !isObject(data)) return;
    if (!Object.keys(required).some((key) => key in data)) return;

    const granted = getGrantedConsent(required, collector.consent) !== false;
    const { fbq } = getEnv(env).window;
    if (typeof fbq !== 'function') return;

    await call(
      () => fbq('consent', granted ? 'grant' : 'revoke'),
      'consent-not-applied',
      'Meta Pixel did not take the consent update',
    );
  },
};

export default destinationMeta;
