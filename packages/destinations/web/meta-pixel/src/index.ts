import type { WalkerOS } from '@elbwalker/types';
import type {
  ContentIds,
  Contents,
  CustomEventConfig,
  Destination,
  PropertyMapping,
  StartSubscribeParameters,
} from './types';

// https://developers.facebook.com/docs/meta-pixel/

// Types
export * as DestinationMetaPixel from './types';

export const destinationMetaPixel: Destination = {
  type: 'meta-pixel',

  config: {},

  init(config) {
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
  if (w.fbq as unknown) return;

  const n = (w.fbq = function (): void {
    // eslint-disable-next-line prefer-spread, prefer-rest-params
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = !0;
  n.version = '2.0';
  n.queue = [];
}

function getParameters(
  event: WalkerOS.Event,
  mapping: CustomEventConfig,
  currency: string = 'EUR',
) {
  // value
  let value = 1;
  if (mapping.value) {
    const valueParams = getParam(mapping.value);
    value = parseFloat(
      String(getByStringDot(event, valueParams.key, valueParams.defaultValue)),
    );
  }

  // content_name
  let content_name = '';
  if (mapping.content_name) {
    const content_nameParams = getParam(mapping.content_name);
    content_name = String(
      getByStringDot(
        event,
        content_nameParams.key,
        content_nameParams.defaultValue,
      ),
    );
  }

  // content_type
  const content_type = mapping.content_type ? mapping.content_type : '';

  // content_ids
  const content_ids = getParameterContentIds(event, mapping);

  switch (mapping.track) {
    case 'AddPaymentInfo':
      return {
        content_ids,
        currency,
        value,
      } as facebook.Pixel.AddPaymentInfoParameters;
    case 'AddToCart':
      return {
        content_ids,
        content_name,
        content_type,
        currency,
        value,
      } as facebook.Pixel.AddToCartParameters;
    case 'AddToWishlist':
      return {
        content_ids,
        content_name,
      } as facebook.Pixel.AddToWishlistParameters;
    case 'CompleteRegistration':
      return {
        content_name,
        currency,
      } as facebook.Pixel.CompleteRegistrationParameters;
    case 'InitiateCheckout':
      return {
        content_ids,
        currency,
        value,
      } as facebook.Pixel.InitiateCheckoutParameters;
    case 'Lead':
      return {
        content_ids,
        content_name,
        currency,
      } as facebook.Pixel.LeadParameters;
    case 'Purchase':
      return {
        content_ids,
        content_name,
        content_type,
        value: value || 1,
        currency,
        contents: getParameterContents(event, mapping),
      } as facebook.Pixel.PurchaseParameters;
    case 'Search':
      return {
        content_ids,
        content_type,
        currency,
        value,
        contents: getParameterContents(event, mapping),
      } as facebook.Pixel.SearchParameters;
    case 'StartTrial':
      return {
        currency,
        value,
      } as StartSubscribeParameters;
    case 'Subscribe':
      return {
        currency,
        value,
      } as StartSubscribeParameters;
    case 'ViewContent':
      return {
        content_ids,
        content_name,
        content_type,
        currency,
        value,
        contents: getParameterContents(event, mapping),
      } as facebook.Pixel.ViewContentParameters;
    default:
      // Contact, CustomizeProduct, Donate, FindLocation, Schedule, SubmitApplication
      return {} as facebook.Pixel.CustomParameters;
  }
}

function getParam(param: PropertyMapping) {
  let key: string;
  let defaultValue: WalkerOS.PropertyType | undefined;

  if (typeof param == 'string') {
    key = param;
  } else {
    key = param.key;
    defaultValue = param.default;
  }

  return { key, defaultValue };
}

function getParameterContentIds(
  event: WalkerOS.Event,
  mapping: CustomEventConfig,
): ContentIds | undefined {
  const contentsMapping = mapping.contents;
  if (!contentsMapping) return;

  const ids: ContentIds = [];

  const idParams = getParam(contentsMapping.id);
  let id = getByStringDot(event, idParams.key, idParams.defaultValue);

  // Both values are required
  if (!id) return;

  if (!Array.isArray(id)) id = [id];

  if (Array.isArray(id)) {
    for (let i = 0; i < id.length; i++) {
      ids.push(String(id[i]));
    }
  }

  return ids;
}

function getParameterContents(
  event: WalkerOS.Event,
  mapping: CustomEventConfig,
): Contents | undefined {
  const contentsMapping = mapping.contents;
  if (!contentsMapping) return;

  const contents: Contents = [];

  const idParams = getParam(contentsMapping.id);
  const quantityParams = getParam(contentsMapping.quantity);
  let id = getByStringDot(event, idParams.key, idParams.defaultValue);
  let quantity = getByStringDot(
    event,
    quantityParams.key,
    quantityParams.defaultValue,
  );

  // Both values are required
  if (!id || !quantity) return;

  if (!Array.isArray(id)) id = [id];
  if (!Array.isArray(quantity)) quantity = [quantity];

  if (Array.isArray(id) && Array.isArray(quantity)) {
    for (let i = 0; i < id.length; i++) {
      contents.push({
        id: String(id[i]),
        quantity: parseFloat(String(quantity[i])),
      });
    }
  }

  return contents;
}

function getByStringDot(
  event: unknown,
  key: string,
  defaultValue?: unknown,
  i: unknown = 0,
): unknown {
  // String dot notation for object ("data.id" -> { data: { id: 1 } })
  const keys = key.split('.');
  let values: unknown = event;

  for (let index = 0; index < keys.length; index++) {
    const k = keys[index];

    if (k === '*' && Array.isArray(values)) {
      const remainingKeys = keys.slice(index + 1).join('.');
      const result: unknown[] = [];

      for (const item of values) {
        const value = getByStringDot(item, remainingKeys, defaultValue, i);
        result.push(value);
      }

      return result;
    }

    values =
      values instanceof Object ? values[k as keyof typeof values] : undefined;

    if (!values) break;
  }

  return values || defaultValue;
}

function addScript(src = 'https://connect.facebook.net/en_US/fbevents.js') {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

export default destinationMetaPixel;
