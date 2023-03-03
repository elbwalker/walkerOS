import { DestinationPiwikPro } from './types';
export * from './types/index.d';

export const destinationPiwikPro: DestinationPiwikPro.Function = {
  config: {},

  init(config) {
    const w = window;
    const custom: Partial<DestinationPiwikPro.CustomConfig> =
      config.custom || {};

    // Required parameters
    if (!custom.appId || !custom.url) return false;

    // Set up the Piwik Pro interface _paq
    w._paq = w._paq || [];

    if (config.loadScript) {
      addScript(custom.url);

      // Register the tracker url only with script loading
      w._paq.push(['setTrackerUrl', custom.url + 'ppms.php']);
    }

    // Register site Id
    w._paq.push(['setSiteId', custom.appId]);

    // Send pageview event
    // @TODO disable pageview
    w._paq.push(['trackPageView']);

    // Download & Outlink tracking
    // @TODO disable link tracking
    w._paq.push(['enableLinkTracking']);

    return true;
  },

  push(event, config, mapping = {}) {
    // Do something magical
  },
};

function addScript(url: string) {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url + 'ppms.js';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export default destinationPiwikPro;
