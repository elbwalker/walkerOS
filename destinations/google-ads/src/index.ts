import { DestinationGoogleAds } from './types';

export const destinationGoogleAds: DestinationGoogleAds.Function = {
  type: 'google-ads',

  config: {},

  init(config: DestinationGoogleAds.Config) {
    const custom = config.custom || {};
    const w = window;

    // required measuremt id
    if (!custom.conversionId) return false;

    // Default currency value
    custom.currency = custom.currency || 'EUR';

    if (config.loadScript) addScript(custom.conversionId);

    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        w.dataLayer!.push(arguments);
      };
      w.gtag('js', new Date());
    }

    // gtag init call
    w.gtag('config', custom.conversionId);

    return true;
  },

  push(event, config, mapping = {}): void {
    const customMapping = mapping.custom;

    if (!customMapping) return;

    if (!customMapping.label) return;
    const custom = config.custom || {};

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

    window.gtag('event', 'conversion', eventParams);
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
