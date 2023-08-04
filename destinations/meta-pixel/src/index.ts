import type { IElbwalker, Walker } from '@elbwalker/walker.js';
import type { DestinationMetaPixel } from './types';

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
  const value = mapping.value
    ? parseFloat(String(event.data[mapping.value]))
    : 1;
  const content_name = mapping.name ? String(event.data[mapping.name]) : '';

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
        value,
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
        contents: getParameterContents(event, mapping),
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
        contents: getParameterContents(event, mapping),
      } as facebook.Pixel.ViewContentParameters;
    default:
      // Contact, CustomizeProduct, Donate, FindLocation, Schedule, SubmitApplication
      return {} as facebook.Pixel.CustomParameters;
  }
}

function getMappedParam(
  event: IElbwalker.Event,
  param: DestinationMetaPixel.PropertyMapping,
  i: number = 0,
): Walker.PropertyType | undefined {
  let { key, defaultValue } = getParam(param);

  // String dot notation for object ("data.id" -> { data: { id: 1 } })
  const value =
    (getByStringDot(event, key, i) as Walker.PropertyType | undefined) ||
    defaultValue;

  return value;
}

function getParam(param: DestinationMetaPixel.PropertyMapping) {
  let key: string;
  let defaultValue: Walker.PropertyType | undefined;

  if (typeof param == 'string') {
    key = param;
  } else {
    key = param.key;
    defaultValue = param.default;
  }

  return { key, defaultValue };
}

function getParameterContents(
  event: IElbwalker.Event,
  mapping: DestinationMetaPixel.CustomEventConfig,
): Array<{ id: string; quantity: number }> | undefined {
  const contentsMapping = mapping.contents;
  if (!contentsMapping) return;

  const contents: Array<{ id: string; quantity: number }> = [];
  const idKey = getParam(contentsMapping.id).key;
  const [key, i] = idKey.split('.');

  //@TODO handle the * and also context
  if (key == 'nested' && i == '*') {
    event[key].map((e, i) => {
      const id = String(getMappedParam(event, contentsMapping.id, i));
      const quantity = parseFloat(
        String(getMappedParam(event, contentsMapping.quantity, i)),
      );

      if (id && quantity) contents[i] = { id, quantity };
    });
  } else {
    const id = String(getMappedParam(event, contentsMapping.id));
    const quantity = parseFloat(
      String(getMappedParam(event, contentsMapping.quantity)),
    );

    if (id && quantity) contents[0] = { id, quantity };
  }

  return contents;
}

function getByStringDot(event: unknown, key: string, i: unknown = 0): unknown {
  // String dot notation for object ("data.id" -> { data: { id: 1 } })
  const value = key.split('.').reduce((obj, key) => {
    // Update the wildcard to the given index
    if (key == '*') key = String(i);

    if (obj instanceof Object) return obj[key as keyof typeof obj];

    return;
  }, event);

  return value;
}

function addScript(src = 'https://connect.facebook.net/en_US/fbevents.js') {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

export default destinationMetaPixel;
