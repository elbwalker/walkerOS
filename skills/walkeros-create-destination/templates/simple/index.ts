import type { Config, Destination, Env, Types } from './types';
import type { Destination as CoreDestination, WalkerOS } from '@walkeros/core';
import { getGrantedConsent, isObject, StepError } from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
import { getEnv, loadVendor } from '@walkeros/web-core';

export * as DestinationVendor from './types';

const SCRIPT_SRC = 'https://vendor.com/sdk.js';

/**
 * Vendor destination template (web, vendor script that defines a global).
 *
 * Key patterns:
 * 1. A failure is a throw. Never `return` early when nothing was sent, and
 *    never log a failure yourself: the collector turns a thrown StepError
 *    into a failed push, a DLQ entry and one ERROR line.
 * 2. Await every call the vendor makes; a call that is not awaited fails after
 *    the push was already counted as delivered.
 * 3. Load scripts with `loadVendor`: a blocked or slow script becomes
 *    `vendor-not-loaded` / `vendor-timeout` instead of lost events.
 * 4. Honour `rule.silent`: send no event of its own, keep the side effects.
 * 5. Pass consent to the vendor in `on('consent')` when the vendor has a
 *    switch for it; `config.consent` decides.
 * 6. Use getEnv<Env>(env) - never access window/document directly, and never
 *    cast them.
 */

/** The script `loadVendor` injects with `loadScript`; `check()` reports a failed one. */
function vendor(config: Config, env?: Env) {
  return loadVendor(
    config.loadScript ? SCRIPT_SRC : undefined,
    () => getEnv<Env>(env).window.vendorSdk,
    { timeout: config.timeout, document: getEnv<Env>(env).document },
  );
}

/**
 * The SDK global, or a StepError when it is not there. Takes the web env
 * every handler has: `on` receives no destination-typed env.
 */
function sdk(env?: DestinationWeb.Env) {
  const { vendorSdk } = getEnv(env).window;
  if (!vendorSdk)
    throw new StepError('Vendor SDK not ready: window.vendorSdk is missing', {
      code: 'vendor-not-ready',
    });
  return vendorSdk;
}

/** Runs one vendor call; a throw or a rejection becomes a StepError of `code`. */
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

/** The vendor call that sends one event. */
async function send(
  event: WalkerOS.Event,
  { data, env }: CoreDestination.PushContext<Types>,
): Promise<void> {
  const params = isObject(data) ? data : {};
  await call(
    () => sdk(env)('track', event.name, params),
    'transport',
    'Vendor call failed',
  );
}

export const destinationVendor: Destination = {
  type: 'vendor',
  config: {},

  /**
   * Initialize destination. Throw a StepError when it cannot start; never
   * return `false`. A destination with a consent requirement is initialized
   * once consent is granted.
   */
  async init({ config, env }) {
    const { apiKey } = config.settings || {};
    if (!apiKey)
      throw new StepError('Vendor needs settings.apiKey', { code: 'config' });

    // The SDK stub first, so calls queue until the vendor script replays them
    const { window } = getEnv<Env>(env);
    window.vendorSdk =
      window.vendorSdk ||
      function () {
        (window.vendorSdk!.q = window.vendorSdk!.q || []).push(arguments);
      };
    vendor(config, env);

    await call(
      () => sdk(env)('init', apiKey),
      'vendor-not-ready',
      'Vendor init call failed',
    );
  },

  /**
   * Push event to destination. `data` is the mapped data, `rule` the matching
   * mapping rule. A silent rule sends no event of its own: `push` hands the
   * event to `send` unless the rule is silent, and never returns early (the
   * `walkeros/no-silent-return` lint rule is an error). A destination with
   * side-effect mappings (identify, group) runs them in `push` for a silent
   * rule too, and writes one DEBUG line when they resolve to nothing.
   */
  async push(event, context) {
    // A script that fired `error` fails every later push
    vendor(context.config, context.env).check();

    if (!context.rule?.silent) await send(event, context);
  },

  /** Tell the vendor about a consent change when it has a switch for it. */
  async on(type, { config, data, env, collector }) {
    const required = config.consent;
    if (type !== 'consent' || !required || !isObject(data)) return;
    if (!Object.keys(required).some((key) => key in data)) return;

    const granted = getGrantedConsent(required, collector.consent) !== false;
    await call(
      () => sdk(env)('consent', granted ? 'grant' : 'revoke'),
      'consent-not-applied',
      'Vendor did not take the consent update',
    );
  },
};

export default destinationVendor;
