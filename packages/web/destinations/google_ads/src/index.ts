import type { Destination } from './types';
import { isObject } from '@walkerOS/web-collector';

// Types
export * as DestinationAds from './types';

export const destinationAds: Destination = {
  type: 'google-ads',

  config: {},

  init({ config, wrap }) {
    const { settings = {}, loadScript } = config;
    const w = window;

    // required measurement id
    if (!settings.conversionId) return false;

    // Default currency value
    settings.currency = settings.currency || 'EUR';

    if (loadScript) addScript(settings.conversionId);

    w.dataLayer = w.dataLayer || [];

    if (!w.gtag) {
      w.gtag = function gtag() {
        (w.dataLayer as unknown[]).push(arguments);
      };
    }

    const gtag = wrap('gtag', w.gtag);
    gtag('js', new Date());

    // gtag init call
    gtag('config', settings.conversionId);

    return config;
  },

  push(event, { config, mapping = {}, data, wrap }): void {
    const { settings = {} } = config;
    const { name } = mapping;
    const eventData = isObject(data) ? data : {};

    if (!name) return;

    const params: Gtag.CustomParams = {
      send_to: `${settings.conversionId}/${name}`,
      currency: settings.currency,
      ...eventData,
    };

    const gtag = wrap('gtag', window.gtag);
    gtag('event', 'conversion', params);
  },
};

function addScript(
  conversionId: string,
  src = 'https://www.googletagmanager.com/gtag/js?id=',
) {
  const script = document.createElement('script');
  script.src = src + conversionId;
  document.head.appendChild(script);
}

export default destinationAds;
