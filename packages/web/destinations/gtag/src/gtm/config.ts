import type { GTMSettings } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';
import { getEnv } from '@walkeros/web-core';

const defaultDataLayer = 'dataLayer';
const defaultDomain = 'https://www.googletagmanager.com/gtm.js?id=';

export function initGTM(
  settings: GTMSettings,
  loadScript?: boolean,
  env?: DestinationWeb.Env,
): void {
  const { window, document } = getEnv(env);
  const { containerId, dataLayer, domain } = settings;
  const dataLayerName = dataLayer || defaultDataLayer;

  // Initialize the dataLayer (default or custom name)
  if (dataLayerName === defaultDataLayer) {
    window.dataLayer = window.dataLayer || [];
  } else {
    window[dataLayerName] = (window[dataLayerName] as unknown[]) || [];
  }

  // Get the appropriate dataLayer array
  const dataLayerArray = window[dataLayerName] as unknown[];

  dataLayerArray.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });

  // Load the gtm script and container
  if (loadScript && containerId)
    addScript(
      containerId,
      domain || defaultDomain,
      dataLayerName,
      document as Document,
    );
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
