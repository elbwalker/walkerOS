import { IElbwalker, WebDestination } from '@elbwalker/walker.js';

declare global {
  interface Window {
    _fbq?: facebook.Pixel.Event;
    fbq?: facebook.Pixel.Event;
  }
}

const w = window;

export namespace DestinationMeta {
  export interface Config extends WebDestination.Config {
    custom: {
      pixelId: string;
      pageview?: boolean;
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    track?: StandardEventNames;
  }

  export type StandardEventNames =
    | 'AddPaymentInfo'
    | 'AddToCart'
    | 'AddToWishlist'
    | 'CompleteRegistration'
    | 'Contact'
    | 'CustomizeProduct'
    | 'Donate'
    | 'FindLocation'
    | 'InitiateCheckout'
    | 'Lead'
    | 'Purchase'
    | 'Schedule'
    | 'Search'
    | 'StartTrial'
    | 'SubmitApplication'
    | 'Subscribe'
    | 'ViewContent';
}

// https://developers.facebook.com/docs/meta-pixel/

export const destination: DestinationMeta.Function = {
  config: { custom: { pixelId: '' } },

  init() {
    let config = this.config;

    // required pixel id
    if (!config.custom.pixelId) return false;

    // fbq function setup
    setup();

    w.fbq('init', config.custom.pixelId);

    if (config.custom.pageview) w.fbq('track', 'PageView');

    if (config.loadScript) addScript();

    return true;
  },

  push(
    event: IElbwalker.Event,
    mapping: DestinationMeta.EventConfig = {},
  ): void {
    // Standard events
    if (mapping.track) {
      w.fbq('track', mapping.track);
    } else {
      // Custom events
      w.fbq('trackCustom', event.event);
    }
  },
};

function setup() {
  if (w.fbq as any) return;

  const n = (w.fbq = function (): void {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  }) as any;
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = !0;
  n.version = '2.0';
  n.queue = [];
}

function addScript(src = 'https://connect.facebook.net/en_US/fbevents.js') {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

export default destination;
