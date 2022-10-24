import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    // gtag?: Gtag
  }
}

const w = window;

export namespace DestinationAds {
  export interface Config extends WebDestination.Config {
    custom: {
      conversionId: string;
      currency?: string;
      defaultValue?: number;
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    // Custom destination event mapping properties
    label?: string; // Conversion label
    value?: string; // Name of data property key to use for value
  }
}

export const destination: DestinationAds.Function = {
  config: { custom: {} } as DestinationAds.Config,

  init() {
    const config = this.config;
    const custom = config.custom;

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
    mapping: DestinationAds.EventConfig = {},
  ): void {
    if (!mapping.label) return;

    const eventParams: Gtag.CustomParams = {
      send_to: `${this.config.custom.conversionId}/${mapping.label}`,
      currency: this.config.custom.currency,
    };

    if (mapping.value)
      eventParams.value =
        event.data[mapping.value] || this.config.custom.defaultValue;

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
