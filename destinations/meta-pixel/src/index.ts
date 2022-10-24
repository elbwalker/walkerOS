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
      pixelId: string; // Required pixel id
      currency?: string; // Default currency is EUR
      pageview?: boolean; // Send the PageView event (default yes, deactivate actively)
    };
    mapping?: WebDestination.Mapping<EventConfig>;
  }

  export interface Function extends WebDestination.Function {
    config: Config;
  }

  export interface EventConfig extends WebDestination.EventConfig {
    id?: string; // Name of data property key to use in content_ids
    name?: string; // Name of data property key to use as content_name
    track?: StandardEventNames; // Name of a standard event to track
    value?: string; // Name of data property key to use for value
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

  export interface StartSubscribeParameters {
    currency?: string;
    predicted_ltv?: number;
    value?: number;
  }
}

// https://developers.facebook.com/docs/meta-pixel/

export const destination: DestinationMeta.Function = {
  config: { custom: { pixelId: '' } },

  init() {
    let config = this.config;
    const custom = config.custom;

    // load fbevents.js
    if (config.loadScript) addScript();

    // required pixel id
    if (!custom.pixelId) return false;

    // fbq function setup
    setup();

    w.fbq('init', custom.pixelId);

    // PageView event (deactivate actively)
    if (custom.pageview !== false) w.fbq('track', 'PageView');

    return true;
  },

  push(
    event: IElbwalker.Event,
    mapping: DestinationMeta.EventConfig = {},
  ): void {
    // Standard events
    if (mapping.track) {
      const parameters = getParameters(
        mapping.track,
        event,
        mapping,
        this.config.custom.currency,
      );
      w.fbq('track', mapping.track, parameters);
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

function getParameters(
  track: DestinationMeta.StandardEventNames,
  event: IElbwalker.Event,
  mapping: DestinationMeta.EventConfig,
  currency: string = 'EUR',
) {
  const value = mapping.value ? event.data[mapping.value] : '';

  if (track === 'AddPaymentInfo') {
    const parameters: facebook.Pixel.AddPaymentInfoParameters = {};
    return parameters;
  }
  if (track === 'AddToCart') {
    const parameters: facebook.Pixel.AddToCartParameters = {
      currency,
      value: value as number,
    };
    return parameters;
  }
  if (track === 'AddToWishlist') {
    const parameters: facebook.Pixel.AddToWishlistParameters = {};
    return parameters;
  }
  if (track === 'CompleteRegistration') {
    const parameters: facebook.Pixel.CompleteRegistrationParameters = {};
    return parameters;
  }
  if (track === 'InitiateCheckout') {
    const parameters: facebook.Pixel.InitiateCheckoutParameters = {};
    return parameters;
  }
  if (track === 'Lead') {
    const parameters: facebook.Pixel.LeadParameters = {};
    return parameters;
  }
  if (track === 'Purchase') {
    const parameters: facebook.Pixel.PurchaseParameters = {
      value: (value as number) || 1,
      currency,
    };
    return parameters;
  }
  if (track === 'Search') {
    const parameters: facebook.Pixel.SearchParameters = {};
    return parameters;
  }
  if (track === 'StartTrial') {
    const parameters: DestinationMeta.StartSubscribeParameters = {};
    return parameters;
  }
  if (track === 'Subscribe') {
    const parameters: DestinationMeta.StartSubscribeParameters = {};
    return parameters;
  }
  if (track === 'ViewContent') {
    const parameters: facebook.Pixel.ViewContentParameters = {};
    return parameters;
  }

  // Contact, CustomizeProduct, Donate, FindLocation, Schedule, SubmitApplication
  const parameters: facebook.Pixel.CustomParameters = {};
  return parameters;
}

function addScript(src = 'https://connect.facebook.net/en_US/fbevents.js') {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

export default destination;
