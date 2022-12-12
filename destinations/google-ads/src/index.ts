import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    gtag?: Gtag.Gtag;
  }
}

const w = window;

export namespace DestinationAds {
  export interface Config extends WebDestination.Config {
    custom?: {
      conversionId?: string; // The ads accounts id used for every conversion
      currency?: string; // Default currency is EUR
      defaultValue?: number; // Used default value for conversions
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    // Custom destination event mapping properties
    id?: string; // Name of data property key to use as transaction id
    label?: string; // Conversion label
    value?: string; // Name of data property key to use for value
  }
}

export const destination: DestinationAds.Function = {
  config: {},

  init(config: DestinationAds.Config) {
    const custom = config.custom || {};

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

  push(
    event: IElbwalker.Event,
    config?: DestinationAds.Config,
    mapping?: DestinationAds.EventConfig,
  ): void {
    config = config || {};
    mapping = mapping || {};

    if (!mapping.label) return;
    const custom = config.custom || {};

    // Basic conversion parameters
    const eventParams: Gtag.CustomParams = {
      send_to: `${custom.conversionId}/${mapping.label}`,
      currency: custom.currency,
    };

    // value
    if (mapping.value) eventParams.value = event.data[mapping.value];

    // default value
    if (custom.defaultValue && !eventParams.value)
      eventParams.value = custom.defaultValue;

    // transaction_id
    if (mapping.id) eventParams.transaction_id = event.data[mapping.id];

    w.gtag('event', 'conversion', eventParams);
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

export default destination;
