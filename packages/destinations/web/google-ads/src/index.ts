import { Destination } from './types';

// Types
export * as DestinationGoogleAds from './types';

export const destinationGoogleAds: Destination = {
  type: 'google-ads',

  config: {},

  init(config) {
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
        // eslint-disable-next-line prefer-rest-params
        (w.dataLayer as unknown[]).push(arguments);
      };
      func = func || w.gtag;
      func('js', new Date());
    }

    // gtag init call
    func('config', custom.conversionId);

    return config;
  },

  push(event, config, mapping = {}): void {
    // Do not process events from dataLayer source
    if (event.source?.type === 'dataLayer') return;

    const { custom = {}, fn } = config;
    const customMapping = mapping.custom;

    if (!customMapping) return;

    if (!customMapping.label) return;

    // Basic conversion parameters
    const eventParams: Gtag.CustomParams = {
      send_to: `${custom.conversionId}/${customMapping.label}`,
      currency: custom.currency,
    };

    // value
    if (customMapping.value)
      eventParams.value = event.data[customMapping.value];

    // default value
    if (custom.defaultValue && !eventParams.value)
      eventParams.value = custom.defaultValue;

    // transaction_id
    if (customMapping.id)
      eventParams.transaction_id = event.data[customMapping.id];

    const func = fn || window.gtag;
    func('event', 'conversion', eventParams);
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
