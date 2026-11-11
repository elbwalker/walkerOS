import type { WalkerOS } from '@walkeros/core';
import { isDefined, isObject, isString } from '@walkeros/core';
import type {
  Address,
  AdIdentifiers,
  CartData,
  CartItem,
  Consent,
  DeviceInfo,
  Event,
  UserData,
  UserIdentifier,
} from './types';
import {
  CART_DATA_KEYS,
  CART_ITEM_KEYS,
  EVENT_SOURCES,
  KNOWN_KEYS,
} from './constants';
import {
  hashEmail,
  hashName,
  hashPhone,
  normalizePostalCode,
  normalizeRegionCode,
} from './hash';

// Every mapped value that is not sent gets one entry in `dropped`: its key
// and why, never the value. A blank value is no value: absent, not reported.

type Data = Record<string, unknown>;

const EVENT_SOURCE_NAMES = `${EVENT_SOURCES.slice(0, -1).join(', ')} or ${EVENT_SOURCES[EVENT_SOURCES.length - 1]}`;

function isBlank(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (isString(value) && value.trim() === '')
  );
}

/** The string under `key`; a value of another type is reported. */
function stringOf(
  data: Data,
  key: string,
  dropped: string[],
): string | undefined {
  const value = data[key];
  if (isBlank(value)) return undefined;
  if (isString(value)) return value;
  dropped.push(`${key} (not a string)`);
  return undefined;
}

/** The known key a name stands for, typed by its list. */
function knownKey<K extends string>(
  keys: readonly K[],
  key: string,
): K | undefined {
  return keys.find((known) => known === key);
}

/**
 * Format walkerOS event timestamp to RFC 3339 format
 * https://developers.google.com/data-manager/api/reference/rest/v1/Event
 *
 * walkerOS timestamp is in milliseconds, RFC 3339 format: "2024-01-15T10:30:00Z"
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Format user identifiers from mapped data
 * https://developers.google.com/data-manager/api/reference/rest/v1/UserData
 *
 * User data must be explicitly mapped in the mapping configuration. Google
 * takes up to 10 identifiers; this destination sends at most three: email,
 * phone and address.
 */
export async function formatUserData(
  data: Data,
  dropped: string[] = [],
): Promise<UserData | undefined> {
  const identifiers: UserIdentifier[] = [];

  const email = stringOf(data, 'email', dropped);
  if (email !== undefined) {
    const emailAddress = await hashEmail(email);
    if (emailAddress) identifiers.push({ emailAddress });
    else dropped.push('email (not an email address)');
  }

  const phone = stringOf(data, 'phone', dropped);
  if (phone !== undefined) {
    const phoneNumber = await hashPhone(phone);
    if (phoneNumber) identifiers.push({ phoneNumber });
    else dropped.push('phone (not E.164 with a country code)');
  }

  const address = await formatAddress(data, dropped);
  if (address) identifiers.push({ address });

  if (identifiers.length === 0) return undefined;

  return { userIdentifiers: identifiers };
}

const ADDRESS_KEYS = ['firstName', 'lastName', 'regionCode', 'postalCode'];

/**
 * Google needs all four parts of an address: one that misses any is not
 * sent, and the entry names the missing parts.
 */
async function formatAddress(
  data: Data,
  dropped: string[],
): Promise<Address | undefined> {
  if (ADDRESS_KEYS.every((key) => isBlank(data[key]))) return undefined;

  const given = stringOf(data, 'firstName', dropped);
  const family = stringOf(data, 'lastName', dropped);
  const region = stringOf(data, 'regionCode', dropped);
  const postal = stringOf(data, 'postalCode', dropped);

  const givenName = given !== undefined ? await hashName(given, 'given') : '';
  if (given !== undefined && !givenName)
    dropped.push('firstName (only a title)');

  const familyName =
    family !== undefined ? await hashName(family, 'family') : '';
  if (family !== undefined && !familyName)
    dropped.push('lastName (only a suffix)');

  const regionCode =
    region !== undefined ? normalizeRegionCode(region) : undefined;
  if (region !== undefined && !regionCode)
    dropped.push('regionCode (not two letters)');

  const postalCode =
    postal !== undefined ? normalizePostalCode(postal) : undefined;

  if (givenName && familyName && regionCode && postalCode)
    return { givenName, familyName, regionCode, postalCode };

  const parts = {
    firstName: givenName,
    lastName: familyName,
    regionCode,
    postalCode,
  };
  const missing = Object.entries(parts)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  dropped.push(`address (missing ${missing.join(', ')})`);
  return undefined;
}

/**
 * Extract and format attribution identifiers from mapped data
 * https://developers.google.com/data-manager/api/reference/rest/v1/AdIdentifiers
 *
 * Attribution identifiers should be mapped explicitly in the mapping configuration.
 * Example: { gclid: 'context.gclid', gbraid: 'context.gbraid' }
 */
export function formatAdIdentifiers(
  data: Data,
  dropped: string[] = [],
): AdIdentifiers | undefined {
  const identifiers: AdIdentifiers = {};

  const gclid = stringOf(data, 'gclid', dropped);
  if (gclid !== undefined) identifiers.gclid = gclid;
  const gbraid = stringOf(data, 'gbraid', dropped);
  if (gbraid !== undefined) identifiers.gbraid = gbraid;
  const wbraid = stringOf(data, 'wbraid', dropped);
  if (wbraid !== undefined) identifiers.wbraid = wbraid;
  const sessionAttributes = stringOf(data, 'sessionAttributes', dropped);
  if (sessionAttributes !== undefined)
    identifiers.sessionAttributes = sessionAttributes;

  return Object.keys(identifiers).length > 0 ? identifiers : undefined;
}

/**
 * Cart data from Google's CartData and Item fields, values kept the way
 * they were mapped. A cart without items is not sent.
 * https://developers.google.com/data-manager/api/reference/rest/v1/Event#CartData
 */
export function formatCartData(
  value: unknown,
  dropped: string[] = [],
): CartData | undefined {
  if (isBlank(value)) return undefined;
  if (!isObject(value)) {
    dropped.push('cartData (not an object)');
    return undefined;
  }

  const items: CartItem[] = [];
  const entries: unknown[] = Array.isArray(value.items) ? value.items : [];
  entries.forEach((entry, index) => {
    const path = `cartData.items[${index}]`;
    if (isObject(entry)) items.push(formatCartItem(entry, path, dropped));
    else dropped.push(`${path} (not an object)`);
  });
  if (items.length === 0) {
    dropped.push('cartData (no items)');
    return undefined;
  }

  const cart: CartData = { items };
  for (const [key, field] of Object.entries(value)) {
    if (key === 'items' || isBlank(field)) continue;
    const known = knownKey(CART_DATA_KEYS, key);
    if (known === undefined || known === 'items')
      dropped.push(`cartData.${key} (not sent by this destination)`);
    else cart[known] = field;
  }
  return cart;
}

function formatCartItem(
  entry: WalkerOS.AnyObject,
  path: string,
  dropped: string[],
): CartItem {
  const item: CartItem = {};
  for (const [key, field] of Object.entries(entry)) {
    if (isBlank(field)) continue;
    const known = knownKey(CART_ITEM_KEYS, key);
    if (known === undefined)
      dropped.push(`${path}.${key} (not sent by this destination)`);
    else item[known] = field;
  }
  return item;
}

/**
 * Map walkerOS consent to Data Manager consent format
 * https://developers.google.com/data-manager/api/devguides/concepts/dma
 *
 * walkerOS: { marketing: true, personalization: false }
 * Data Manager: { adUserData: 'CONSENT_GRANTED', adPersonalization: 'CONSENT_DENIED' }
 */
export function formatConsent(
  walkerOSConsent: WalkerOS.Consent | undefined,
): Consent | undefined {
  if (!walkerOSConsent) return undefined;

  const consent: Consent = {};

  // Map marketing consent to adUserData
  if (isDefined(walkerOSConsent.marketing)) {
    consent.adUserData = walkerOSConsent.marketing
      ? 'CONSENT_GRANTED'
      : 'CONSENT_DENIED';
  }

  // Map personalization consent to adPersonalization
  if (isDefined(walkerOSConsent.personalization)) {
    consent.adPersonalization = walkerOSConsent.personalization
      ? 'CONSENT_GRANTED'
      : 'CONSENT_DENIED';
  }

  return Object.keys(consent).length > 0 ? consent : undefined;
}

/**
 * Format complete event for Data Manager API
 * https://developers.google.com/data-manager/api/reference/rest/v1/Event
 */
export async function formatEvent(
  event: WalkerOS.Event,
  mappedData?: Data,
  dropped: string[] = [],
): Promise<Event> {
  const dataManagerEvent: Event = {
    eventTimestamp: formatTimestamp(event.timestamp),
  };

  // Use only mapped data (no fallback to event.data)
  const data = mappedData || {};

  for (const [key, value] of Object.entries(data)) {
    if (!isBlank(value) && knownKey(KNOWN_KEYS, key) === undefined)
      dropped.push(`${key} (not sent by this destination)`);
  }

  // Transaction ID for deduplication; a finite number is sent in its string form
  const transactionId = data.transactionId;
  if (isString(transactionId) && !isBlank(transactionId))
    dataManagerEvent.transactionId = transactionId.substring(0, 512);
  else if (typeof transactionId === 'number' && Number.isFinite(transactionId))
    dataManagerEvent.transactionId = String(transactionId);
  else if (!isBlank(transactionId))
    dropped.push('transactionId (not a string or number)');

  // Client ID (GA)
  const clientId = stringOf(data, 'clientId', dropped);
  if (clientId !== undefined)
    dataManagerEvent.clientId = clientId.substring(0, 255);

  // User ID
  const userId = stringOf(data, 'userId', dropped);
  if (userId !== undefined) dataManagerEvent.userId = userId.substring(0, 256);

  // User data
  const userData = await formatUserData(data, dropped);
  if (userData) {
    dataManagerEvent.userData = userData;
  }

  // Attribution identifiers
  const adIdentifiers = formatAdIdentifiers(data, dropped);
  if (adIdentifiers) {
    dataManagerEvent.adIdentifiers = adIdentifiers;
  }

  // Conversion value
  const conversionValue = data.conversionValue;
  if (typeof conversionValue === 'number' && Number.isFinite(conversionValue))
    dataManagerEvent.conversionValue = conversionValue;
  else if (!isBlank(conversionValue))
    dropped.push('conversionValue (not a number)');

  // Currency
  const currency = stringOf(data, 'currency', dropped);
  if (currency !== undefined)
    dataManagerEvent.currency = currency.substring(0, 3).toUpperCase();

  // Cart data
  const cartData = formatCartData(data.cartData, dropped);
  if (cartData) dataManagerEvent.cartData = cartData;

  // Event name (for GA4)
  const eventName = stringOf(data, 'eventName', dropped);
  if (eventName !== undefined)
    dataManagerEvent.eventName = eventName.substring(0, 40);

  // App instance ID (GA4 app stream)
  const appInstanceId = stringOf(data, 'appInstanceId', dropped);
  if (appInstanceId !== undefined)
    dataManagerEvent.appInstanceId = appInstanceId;

  // Store ID (Google Ads store sales / IN_STORE events)
  const storeId = stringOf(data, 'storeId', dropped);
  if (storeId !== undefined) dataManagerEvent.eventLocation = { storeId };

  // Device info (client IP and user agent)
  const deviceInfo: DeviceInfo = {};
  const ipAddress = stringOf(data, 'ipAddress', dropped);
  if (ipAddress !== undefined) deviceInfo.ipAddress = ipAddress;
  const userAgent = stringOf(data, 'userAgent', dropped);
  if (userAgent !== undefined) deviceInfo.userAgent = userAgent;
  if (Object.keys(deviceInfo).length > 0) {
    dataManagerEvent.eventDeviceInfo = deviceInfo;
  }

  // Event source; without one the settings default applies
  if (!isBlank(data.eventSource)) {
    const eventSource = EVENT_SOURCES.find(
      (source) => source === data.eventSource,
    );
    if (eventSource) dataManagerEvent.eventSource = eventSource;
    else dropped.push(`eventSource (not ${EVENT_SOURCE_NAMES})`);
  }

  // A consent value that is no boolean is reported; the mapping below reads
  // booleans only.
  if (!isBlank(data.adUserData) && typeof data.adUserData !== 'boolean')
    dropped.push('adUserData (not a boolean)');
  if (
    !isBlank(data.adPersonalization) &&
    typeof data.adPersonalization !== 'boolean'
  )
    dropped.push('adPersonalization (not a boolean)');

  // Consent - check mapped data first, then fallback to event.consent
  const mappedConsent: Consent = {};

  // Check for mapped consent values (from Settings or event mapping)
  if (typeof data.adUserData === 'boolean') {
    mappedConsent.adUserData = data.adUserData
      ? 'CONSENT_GRANTED'
      : 'CONSENT_DENIED';
  }
  if (typeof data.adPersonalization === 'boolean') {
    mappedConsent.adPersonalization = data.adPersonalization
      ? 'CONSENT_GRANTED'
      : 'CONSENT_DENIED';
  }

  // If no mapped consent, fall back to event.consent
  if (Object.keys(mappedConsent).length === 0) {
    const eventConsent = formatConsent(event.consent);
    if (eventConsent) {
      dataManagerEvent.consent = eventConsent;
    }
  } else {
    dataManagerEvent.consent = mappedConsent;
  }

  return dataManagerEvent;
}
