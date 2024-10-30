import type { WalkerOS } from '@elbwalker/types';
import type {
  ContentIds,
  Contents,
  CustomEventConfig,
  StartSubscribeParameters,
} from './types';
import { getMappingValue } from '@elbwalker/utils';

export function getParameters(
  event: WalkerOS.Event,
  mapping: CustomEventConfig,
  currency: string = 'EUR',
) {
  // value
  let value = 1;
  if (mapping.value)
    value = parseFloat(String(getMappingValue(event, mapping.value)));

  // content_name
  let content_name = '';
  if (mapping.content_name)
    content_name = String(getMappingValue(event, mapping.content_name));

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

function getParameterContentIds(
  event: WalkerOS.Event,
  mapping: CustomEventConfig,
): ContentIds | undefined {
  const contentsMapping = mapping.contents;
  if (!contentsMapping) return;

  const ids: ContentIds = [];

  let id = getMappingValue(event, contentsMapping.id);
  // @TODO check if id isn't already an array

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
  const { id, quantity } = mapping.contents || {};
  if (!id || !quantity) return;

  let idValue = getMappingValue(event, id);
  let quantityValue = getMappingValue(event, quantity);

  // Both values are required
  if (!idValue || !quantityValue) return;

  if (!Array.isArray(idValue)) idValue = [idValue];
  if (!Array.isArray(quantityValue)) quantityValue = [quantityValue];

  const contents: Contents = [];
  if (Array.isArray(idValue) && Array.isArray(quantityValue)) {
    for (let i = 0; i < idValue.length; i++) {
      contents.push({
        id: String(idValue[i]),
        quantity: parseFloat(String(quantityValue[i])),
      });
    }
  }

  return contents;
}
