import type { Logger } from '@walkeros/core';
import type { GTMSettings, Env } from '../types';
import { isArray } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

export const defaultDataLayer = 'dataLayer';
const defaultDomain = 'https://www.googletagmanager.com/gtm.js?id=';

export function initGTM(
  settings: GTMSettings,
  loadScript?: boolean,
  env?: Env,
  _logger?: Logger.Instance,
): void {
  const { window, document } = getEnv<Env>(env);
  const { containerId, dataLayer, domain } = settings;
  const dataLayerName = dataLayer || defaultDataLayer;

  // Initialize the dataLayer (default or custom name). Custom names resolve
  // through Window's index signature as `unknown`, so narrow before reuse.
  const existing = window[dataLayerName];
  const dataLayerArray: unknown[] = isArray(existing) ? existing : [];
  window[dataLayerName] = dataLayerArray;

  dataLayerArray.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });

  // Load the gtm script and container
  if (loadScript && containerId)
    addScript(containerId, domain || defaultDomain, dataLayerName, document);
}

function addScript(
  containerId: string,
  src: string,
  dataLayerName: string,
  document: Document = globalThis.document,
) {
  const dl = dataLayerName != defaultDataLayer ? '&l=' + dataLayerName : '';
  const script = document.createElement('script');
  script.src = src + containerId + dl;
  document.head.appendChild(script);
}
