import type { Destination, Env, Settings } from './types';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

export * as DestinationVendor from './types';

/**
 * Simple destination template.
 *
 * Key patterns:
 * 1. Init receives context - destructure config, env, logger, id
 * 2. Push receives context - includes data, rule (renamed from mapping), ingest
 * 3. Use getEnv<Env>(env) - never access window/document directly, and never
 *    cast them: the generic returns your narrowed Env merged with the DOM
 *    globals, so window.vendorSdk / document.createElement are already typed
 * 4. Return config from init - allows updating config during initialization
 */
export const destinationVendor: Destination = {
  type: 'vendor',
  config: {},

  /**
   * Initialize destination - receives context object.
   *
   * @param context - Init context containing:
   *   - config: Destination configuration (settings, mapping, etc.)
   *   - env: Environment with window, document, etc.
   *   - logger: Logger instance
   *   - id: Unique destination identifier
   *   - collector: Collector instance reference
   *   - data: Pre-computed data from mapping
   */
  init(context) {
    const { config, env } = context;
    const { window } = getEnv<Env>(env);
    const settings = config.settings || {};

    if (config.loadScript) addScript(settings, env);

    // Initialize vendor SDK queue
    window.vendorSdk =
      window.vendorSdk ||
      function () {
        (window.vendorSdk!.q = window.vendorSdk!.q || []).push(arguments);
      };

    return config;
  },

  /**
   * Push event to destination - receives event and push context.
   *
   * @param event - The walkerOS event to send
   * @param context - Push context containing:
   *   - config: Destination configuration
   *   - env: Environment
   *   - logger: Logger instance
   *   - id: Destination identifier
   *   - data: Pre-computed data from mapping
   *   - rule: The matching mapping rule (renamed from 'mapping')
   *   - ingest: Optional request metadata from source
   */
  push(event, context) {
    const { data, env } = context;
    const params = isObject(data) ? data : {};
    const { window } = getEnv<Env>(env);

    // Call vendor API - must match outputs.ts examples
    window.vendorSdk!('track', event.name, params);
  },
};

function addScript(settings: Settings, env?: Env) {
  const { document } = getEnv<Env>(env);
  const script = document.createElement('script');
  script.src = `https://vendor.com/sdk.js?key=${settings.apiKey}`;
  document.head.appendChild(script);
}

export default destinationVendor;
