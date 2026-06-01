import type { Destination, Env, Settings, VendorSdk } from './types';
import { isObject } from '@walkeros/core';

export * as DestinationVendor from './types';

/**
 * Simple destination template.
 *
 * Key patterns:
 * 1. Init receives context - destructure config, env, logger, id
 * 2. Push receives context - includes data, rule (renamed from mapping), ingest
 * 3. Resolve the SDK cast-free - prefer the injected env (tests, simulation),
 *    fall back to the typed `window` global declared in types.ts
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
    const { config } = context;
    const settings = config.settings || {};

    if (config.loadScript) addScript(settings);

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

    const vendorSdk = resolveSdk(env);
    if (!vendorSdk) return;

    // Call vendor API - must match the step examples
    vendorSdk('track', event.name, params);
  },
};

/**
 * Resolve the vendor SDK without casts: prefer the injected env (tests,
 * simulation), fall back to the browser global declared on `Window`.
 */
function resolveSdk(env: Env): VendorSdk | undefined {
  return (
    env.window?.vendorSdk ??
    (typeof window !== 'undefined' ? window.vendorSdk : undefined)
  );
}

function addScript(settings: Settings) {
  if (typeof document === 'undefined') return;
  const script = document.createElement('script');
  script.src = `https://vendor.com/sdk.js?key=${settings.apiKey}`;
  document.head.appendChild(script);
}

export default destinationVendor;
