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
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    // Custom destination event mapping properties
  }
}

export const destination: DestinationAds.Function = {
  config: { custom: { conversionId: '' } },

  init() {
    let config = this.config;
    const settings: IElbwalker.AnyObject = {};

    // required measuremt id
    if (!config.custom.conversionId) return false;

    if (config.loadScript) addScript(config.custom.conversionId);

    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        w.dataLayer!.push(arguments);
      };
      w.gtag('js', new Date());
    }

    // gtag init call
    w.gtag('config', config.custom.conversionId);

    return true;
  },

  push(event: IElbwalker.Event): void {
    // Do something magical
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
