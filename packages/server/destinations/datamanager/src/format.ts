import type { WalkerOS } from '@walkeros/core';
import { isString, isDefined } from '@walkeros/core';
import type {
  Event,
  UserData,
  UserIdentifier,
  AdIdentifiers,
  Consent,
  ConsentStatus,
} from './types';
import { hashEmail, hashPhone, hashName } from './hash';

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
 * User data must be explicitly mapped in the mapping configuration.
 * Max 10 identifiers per event
 */
export async function formatUserData(
  data: Record<string, unknown>,
): Promise<UserData | undefined> {
  const identifiers: UserIdentifier[] = [];

  // Extract from mapped data only
  // Email
  if (isString(data.email) && data.email) {
    const hashedEmail = await hashEmail(data.email);
    if (hashedEmail) {
      identifiers.push({ emailAddress: hashedEmail });
    }
  }

  // Phone
  if (isString(data.phone) && data.phone) {
    const hashedPhone = await hashPhone(data.phone);
    if (hashedPhone) {
      identifiers.push({ phoneNumber: hashedPhone });
    }
  }

  // Address from mapped properties
  const hasAddress =
    data.firstName || data.lastName || data.regionCode || data.postalCode;

  if (hasAddress) {
    const address: Record<string, string> = {};

    if (isString(data.firstName) && data.firstName) {
      address.givenName = await hashName(data.firstName, 'given');
    }

    if (isString(data.lastName) && data.lastName) {
      address.familyName = await hashName(data.lastName, 'family');
    }

    // Region code is NOT hashed
    if (isString(data.regionCode) && data.regionCode) {
      address.regionCode = data.regionCode.toUpperCase();
    }

    // Postal code is NOT hashed
    if (isString(data.postalCode) && data.postalCode) {
      address.postalCode = data.postalCode;
    }

    if (Object.keys(address).length > 0) {
      identifiers.push({ address });
    }
  }

  // Limit to 10 identifiers
  if (identifiers.length === 0) return undefined;

  return {
    userIdentifiers: identifiers.slice(0, 10),
  };
}

/**
 * Extract and format attribution identifiers from mapped data
 * https://developers.google.com/data-manager/api/reference/rest/v1/AdIdentifiers
 *
 * Attribution identifiers should be mapped explicitly in the mapping configuration.
 * Example: { gclid: 'context.gclid', gbraid: 'context.gbraid' }
 */
export function formatAdIdentifiers(
  data: Record<string, unknown>,
): AdIdentifiers | undefined {
  const identifiers: AdIdentifiers = {};

  // Extract from mapped data (already processed by mapping system)
  if (isString(data.gclid) && data.gclid) {
    identifiers.gclid = data.gclid;
  }
  if (isString(data.gbraid) && data.gbraid) {
    identifiers.gbraid = data.gbraid;
  }
  if (isString(data.wbraid) && data.wbraid) {
    identifiers.wbraid = data.wbraid;
  }
  if (isString(data.sessionAttributes) && data.sessionAttributes) {
    identifiers.sessionAttributes = data.sessionAttributes;
  }

  return Object.keys(identifiers).length > 0 ? identifiers : undefined;
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
  mappedData?: Record<string, unknown>,
): Promise<Event> {
  const dataManagerEvent: Event = {
    eventTimestamp: formatTimestamp(event.timestamp),
  };

  // Use only mapped data (no fallback to event.data)
  const data = mappedData || {};

  // Transaction ID for deduplication
  if (isString(data.transactionId) && data.transactionId) {
    dataManagerEvent.transactionId = data.transactionId.substring(0, 512);
  }

  // Client ID (GA)
  if (isString(data.clientId) && data.clientId) {
    dataManagerEvent.clientId = data.clientId.substring(0, 255);
  }

  // User ID
  if (isString(data.userId) && data.userId) {
    dataManagerEvent.userId = data.userId.substring(0, 256);
  }

  // User data
  const userData = await formatUserData(data);
  if (userData) {
    dataManagerEvent.userData = userData;
  }

  // Attribution identifiers
  const adIdentifiers = formatAdIdentifiers(data);
  if (adIdentifiers) {
    dataManagerEvent.adIdentifiers = adIdentifiers;
  }

  // Conversion value
  if (typeof data.conversionValue === 'number') {
    dataManagerEvent.conversionValue = data.conversionValue;
  }

  // Currency
  if (isString(data.currency) && data.currency) {
    dataManagerEvent.currency = data.currency.substring(0, 3).toUpperCase();
  }

  // Cart data
  if (data.cartData && typeof data.cartData === 'object') {
    dataManagerEvent.cartData = data.cartData as Event['cartData'];
  }

  // Event name (for GA4)
  if (isString(data.eventName) && data.eventName) {
    dataManagerEvent.eventName = data.eventName.substring(0, 40);
  }

  // Event source
  if (isString(data.eventSource) && data.eventSource) {
    dataManagerEvent.eventSource = data.eventSource as Event['eventSource'];
  }

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
