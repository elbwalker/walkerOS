import type { Destination } from './types';
import { isObject } from '@walkerOS/utils';

// Types
export * as DestinationAds from './types';

export const destinationAds: Destination = {
  type: 'google-ads',

  config: {},

  init(config = {}) {
    const { settings = {}, fn, loadScript } = config;
    const w = window;

    // required measurement id
    if (!settings.conversionId) return false;

    // Default currency value
    settings.currency = settings.currency || 'EUR';

    if (loadScript) addScript(settings.conversionId);

    w.dataLayer = w.dataLayer || [];

    let func = fn || w.gtag;
    if (!w.gtag) {
      w.gtag = function gtag() {
        (w.dataLayer as unknown[]).push(arguments);
      };
      func = func || w.gtag;
      func('js', new Date());
    }

    // gtag init call
    func('config', settings.conversionId);

    return config;
  },

  push(event, config, mapping = {}, options = {}): void {
    const { settings = {}, fn } = config;
    const { name } = mapping;
    const data = isObject(options.data) ? options.data : {};

    if (!name) return;

    const params: Gtag.CustomParams = {
      send_to: `${settings.conversionId}/${name}`,
      currency: settings.currency,
      ...data,
    };

    const func = fn || window.gtag;
    func('event', 'conversion', params);
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
