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
      // Load the JavaScript Tracking Client
      addScript(custom.url);

      // Register the tracker url only with script loading
      w._paq.push(['setTrackerUrl', custom.url + 'ppms.php']);

      // Register app id
      w._paq.push(['setSiteId', custom.appId]);
    }

    // Send pageviews if not disabled
    if (custom.pageview !== false) w._paq.push(['trackPageView']);

    // Enable download and outlink tracking if not disabled
    if (custom.linkTracking !== false) w._paq.push(['enableLinkTracking']);

    return true;
  },

  push(event, config, mapping = {}) {
    window._paq!.push([
      'trackEvent',
      event.entity,
      event.action,
      // name,
      // value,
      // dimensions
    ]);
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
