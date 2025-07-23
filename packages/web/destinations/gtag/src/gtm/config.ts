import type { GTMSettings, WindowData } from '../types';

const defaultDataLayer = 'dataLayer';
const defaultDomain = 'https://www.googletagmanager.com/gtm.js?id=';

export function initGTM(
  settings: GTMSettings,
  wrap: (name: string, fn: Function) => Function,
  loadScript?: boolean,
): void {
  const { containerId, dataLayer, domain } = settings;
  const dataLayerName = dataLayer || defaultDataLayer;

  const win = window as WindowData;

  // Initialize the dataLayer (default or custom name)
  if (dataLayerName === defaultDataLayer) {
    win.dataLayer = win.dataLayer || [];
  } else {
    win[dataLayerName] = (win[dataLayerName] as unknown[]) || [];
  }

  // Get the appropriate dataLayer array
  const dataLayerArray = win[dataLayerName] as unknown[];

  const push = wrap('dataLayer.push', dataLayerArray.push.bind(dataLayerArray));
  push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });

  // Load the gtm script and container
  if (loadScript && containerId)
    addScript(containerId, domain || defaultDomain, dataLayerName);
}

function addScript(containerId: string, src: string, dataLayerName: string) {
  const dl = dataLayerName != defaultDataLayer ? '&l=' + dataLayerName : '';
  const script = document.createElement('script');
  script.src = src + containerId + dl;
  document.head.appendChild(script);
}
