import { IElbwalker } from '@elbwalker/walker.js';
import { DestinationMetaPixel } from './types';

// https://developers.facebook.com/docs/meta-pixel/

export const destinationMetaPixel: DestinationMetaPixel.Function = {
  config: {},

  init(config: DestinationMetaPixel.Config) {
    const custom = config.custom || {};

    // load fbevents.js
    if (config.loadScript) addScript();

    // required pixel id
    if (!custom.pixelId) return false;

    // fbq function setup
    setup();

    window.fbq('init', custom.pixelId);

    // PageView event (deactivate actively)
    if (custom.pageview !== false) window.fbq('track', 'PageView');

    return true;
  },

  push(event, config, mapping = {}) {
    const custom = config.custom;
    if (!custom) return;

    const customMapping = mapping.custom || {};

    // Standard events
    if (customMapping.track) {
      const parameters = getParameters(event, customMapping, custom.currency);
      window.fbq('track', customMapping.track, parameters);
    } else {
      // Custom events
      window.fbq('trackCustom', event.event);
    }
  },
};

function setup() {
  const w = window;
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
  event: IElbwalker.Event,
  mapping: DestinationMetaPixel.CustomEventConfig,
  currency: string = 'EUR',
) {
  const value = mapping.value ? (event.data[mapping.value] as number) : 1;
  const content_name = mapping.name ? (event.data[mapping.name] as string) : '';

  switch (mapping.track) {
    case 'AddPaymentInfo':
      return {
        currency,
        value,
      } as facebook.Pixel.AddPaymentInfoParameters;
    case 'AddToCart':
      return {
        content_name,
        currency,
        value: value as number,
      } as facebook.Pixel.AddToCartParameters;
    case 'AddToWishlist':
      return {
        content_name,
      } as facebook.Pixel.AddToWishlistParameters;
    case 'CompleteRegistration':
      return {
        content_name,
        currency,
      } as facebook.Pixel.CompleteRegistrationParameters;
    case 'InitiateCheckout':
      return {
        currency,
        value,
      } as facebook.Pixel.InitiateCheckoutParameters;
    case 'Lead':
      return {
        content_name,
        currency,
      } as facebook.Pixel.LeadParameters;
    case 'Purchase':
      return {
        content_name,
        value: value || 1,
        currency,
      } as facebook.Pixel.PurchaseParameters;
    case 'Search':
      return {
        currency,
        value,
      } as facebook.Pixel.SearchParameters;
    case 'StartTrial':
      return {
        currency,
        value,
      } as DestinationMetaPixel.StartSubscribeParameters;
    case 'Subscribe':
      return {
        currency,
        value,
      } as DestinationMetaPixel.StartSubscribeParameters;
    case 'ViewContent':
      return {
        content_name,
        currency,
        value,
      } as facebook.Pixel.ViewContentParameters;
    default:
      // Contact, CustomizeProduct, Donate, FindLocation, Schedule, SubmitApplication
      return {} as facebook.Pixel.CustomParameters;
  }
}

function addScript(src = 'https://connect.facebook.net/en_US/fbevents.js') {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

export default destinationMetaPixel;
