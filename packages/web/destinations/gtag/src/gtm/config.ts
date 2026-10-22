import type { Logger } from '@walkeros/core';
import type { GTMSettings, Env } from '../types';
import { isArray } from '@walkeros/core';
import { getEnv, loadVendor } from '@walkeros/web-core';

export const defaultDataLayer = 'dataLayer';
const defaultDomain = 'https://www.googletagmanager.com/gtm.js?id=';

/**
 * The GTM container script `loadVendor` injects (once per src and page). The
 * container replays its dataLayer, so it is only watched for a failure.
 */
export function gtmVendor(settings: GTMSettings, timeout?: number, env?: Env) {
  const { containerId = '', dataLayer, domain } = settings;
  const dataLayerName = dataLayer || defaultDataLayer;
  const dl = dataLayerName != defaultDataLayer ? '&l=' + dataLayerName : '';
  const { window, document } = getEnv<Env>(env);
  return loadVendor(
    (domain || defaultDomain) + containerId + dl,
    () => window[dataLayerName],
    { timeout, document },
  );
}

export function initGTM(
  settings: GTMSettings,
  loadScript?: boolean,
  env?: Env,
  _logger?: Logger.Instance,
  // The destination's timeout, the deadline of the injected script.
  timeout?: number,
): unknown[] {
  const { window } = getEnv<Env>(env);
  const { containerId, dataLayer } = settings;
  const dataLayerName = dataLayer || defaultDataLayer;

  // Initialize the dataLayer (default or custom name). Custom names resolve
  // through Window's index signature as `unknown`, so narrow before reuse.
  const existing = window[dataLayerName];
  const dataLayerArray: unknown[] = isArray(existing) ? existing : [];
  window[dataLayerName] = dataLayerArray;

  if (!loadScript || !containerId) return [];

  // Load the gtm script and container. The `gtm.js` bootstrap object is part of
  // that snippet and belongs to whoever loads the container: a container loaded
  // elsewhere pushes its own, and a second one re-fires its Page View triggers.
  const calls = [
    dataLayerArray.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    }),
  ];
  gtmVendor(settings, timeout, env);
  return calls;
}
