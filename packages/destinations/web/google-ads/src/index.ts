import type { Destination } from './types';
import { isObject } from '@elbwalker/utils';

// Types
export * as DestinationGoogleAds from './types';

export const destinationGoogleAds: Destination = {
  type: 'google-ads',

  config: {},

  init(config = {}) {
    const { custom = {}, fn, loadScript } = config;
    const w = window;

    // required measurement id
    if (!custom.conversionId) return false;

    // Default currency value
    custom.currency = custom.currency || 'EUR';

    if (loadScript) addScript(custom.conversionId);

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
    func('config', custom.conversionId);

    return config;
  },

  push(event, config, mapping = {}, options = {}): void {
    const { custom = {}, fn } = config;
    const { name } = mapping;
    const data = isObject(options.data) ? options.data : {};

    if (!name) return;

    const params: Gtag.CustomParams = {
      send_to: `${custom.conversionId}/${name}`,
      currency: custom.currency,
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

export default destinationGoogleAds;
