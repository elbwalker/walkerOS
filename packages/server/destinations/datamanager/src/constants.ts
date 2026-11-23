/**
 * The values and keys Google's Data Manager API takes. The settings schema,
 * the types and format.ts derive from these lists, so each is defined once.
 * https://developers.google.com/data-manager/api/reference/rest/v1/Event
 */

/** Google's EventSource values. */
export const EVENT_SOURCES = [
  'WEB',
  'APP',
  'IN_STORE',
  'PHONE',
  'MESSAGE',
  'OTHER',
] as const;

/** The mapped keys this destination sends; any other key is reported. */
export const KNOWN_KEYS = [
  'transactionId',
  'clientId',
  'userId',
  'email',
  'phone',
  'firstName',
  'lastName',
  'regionCode',
  'postalCode',
  'gclid',
  'gbraid',
  'wbraid',
  'sessionAttributes',
  'conversionValue',
  'currency',
  'cartData',
  'eventName',
  'appInstanceId',
  'storeId',
  'ipAddress',
  'userAgent',
  'eventSource',
  'adUserData',
  'adPersonalization',
] as const;

/** Google's CartData fields. */
export const CART_DATA_KEYS = [
  'merchantId',
  'merchantFeedLabel',
  'merchantFeedLanguageCode',
  'transactionDiscount',
  'items',
  'couponCodes',
] as const;

/** Google's Item fields. */
export const CART_ITEM_KEYS = [
  'merchantProductId',
  'quantity',
  'unitPrice',
  'itemId',
  'additionalItemParameters',
  'merchantId',
  'merchantFeedLabel',
  'merchantFeedLanguageCode',
  'customVariables',
  'conversionValue',
] as const;
