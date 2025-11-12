import type { WalkerOS } from '@walkeros/core';
import { isString, isDefined, isArray } from '@walkeros/core';
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
 * Helper to extract value from context/globals property (which can be [value, scope] tuple or direct value)
 */
function extractValue(prop: unknown): string | undefined {
  if (isString(prop)) return prop;
  if (isArray(prop) && prop.length >= 1 && isString(prop[0])) return prop[0];
  return undefined;
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
 * Extract and format user identifiers from walkerOS event
 * https://developers.google.com/data-manager/api/reference/rest/v1/UserData
 *
 * Max 10 identifiers per event
 */
export async function formatUserData(
  event: WalkerOS.Event,
): Promise<UserData | undefined> {
  const identifiers: UserIdentifier[] = [];

  // Extract email
  if (
    event.user?.id &&
    isString(event.user.id) &&
    event.user.id.includes('@')
  ) {
    const hashedEmail = await hashEmail(event.user.id);
    if (hashedEmail) {
      identifiers.push({ emailAddress: hashedEmail });
    }
  }

  // Extract from data properties
  const data = event.data as Record<string, unknown> | undefined;
  if (data) {
    // Email from data.email
    if (isString(data.email) && data.email) {
      const hashedEmail = await hashEmail(data.email);
      if (hashedEmail) {
        identifiers.push({ emailAddress: hashedEmail });
      }
    }

    // Phone from data.phone
    if (isString(data.phone) && data.phone) {
      const hashedPhone = await hashPhone(data.phone);
      if (hashedPhone) {
        identifiers.push({ phoneNumber: hashedPhone });
      }
    }

    // Address from data properties
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
  }

  // Limit to 10 identifiers
  if (identifiers.length === 0) return undefined;

  return {
    userIdentifiers: identifiers.slice(0, 10),
  };
}

/**
 * Extract attribution identifiers from walkerOS event
 * https://developers.google.com/data-manager/api/reference/rest/v1/AdIdentifiers
 *
 * Priority: context > data > globals
 */
export function formatAdIdentifiers(
  event: WalkerOS.Event,
): AdIdentifiers | undefined {
  const identifiers: AdIdentifiers = {};

  // Check context first (context properties can be [value, scope] tuples)
  const context = event.context as Record<string, unknown> | undefined;
  if (context) {
    const gclid = extractValue(context.gclid);
    if (gclid) identifiers.gclid = gclid;

    const gbraid = extractValue(context.gbraid);
    if (gbraid) identifiers.gbraid = gbraid;

    const wbraid = extractValue(context.wbraid);
    if (wbraid) identifiers.wbraid = wbraid;

    const sessionAttributes = extractValue(context.sessionAttributes);
    if (sessionAttributes) identifiers.sessionAttributes = sessionAttributes;
  }

  // Check data properties
  const data = event.data as Record<string, unknown> | undefined;
  if (data) {
    if (!identifiers.gclid && isString(data.gclid) && data.gclid) {
      identifiers.gclid = data.gclid;
    }
    if (!identifiers.gbraid && isString(data.gbraid) && data.gbraid) {
      identifiers.gbraid = data.gbraid;
    }
    if (!identifiers.wbraid && isString(data.wbraid) && data.wbraid) {
      identifiers.wbraid = data.wbraid;
    }
  }

  // Check globals (globals properties can also be [value, scope] tuples)
  const globals = event.globals as Record<string, unknown> | undefined;
  if (globals && !identifiers.gclid) {
    const gclid = extractValue(globals.gclid);
    if (gclid) identifiers.gclid = gclid;
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

  // Use mapped data if provided, otherwise use event data
  const data = mappedData || (event.data as Record<string, unknown>);

  // Transaction ID for deduplication
  if (isString(data?.transactionId) && data.transactionId) {
    dataManagerEvent.transactionId = data.transactionId.substring(0, 512);
  } else if (event.id) {
    // Fallback to event ID
    dataManagerEvent.transactionId = event.id.substring(0, 512);
  }

  // Client ID (GA)
  if (isString(data?.clientId) && data.clientId) {
    dataManagerEvent.clientId = data.clientId.substring(0, 255);
  }

  // User ID
  if (isString(event.user?.id) && event.user.id) {
    dataManagerEvent.userId = event.user.id.substring(0, 256);
  }

  // User data
  const userData = await formatUserData(event);
  if (userData) {
    dataManagerEvent.userData = userData;
  }

  // Attribution identifiers
  const adIdentifiers = formatAdIdentifiers(event);
  if (adIdentifiers) {
    dataManagerEvent.adIdentifiers = adIdentifiers;
  }

  // Conversion value
  if (typeof data?.conversionValue === 'number') {
    dataManagerEvent.conversionValue = data.conversionValue;
  } else if (typeof data?.value === 'number') {
    // Fallback to 'value' property
    dataManagerEvent.conversionValue = data.value;
  } else if (typeof data?.total === 'number') {
    // Fallback to 'total' property
    dataManagerEvent.conversionValue = data.total;
  }

  // Currency
  if (isString(data?.currency) && data.currency) {
    dataManagerEvent.currency = data.currency.substring(0, 3).toUpperCase();
  }

  // Cart data
  if (data?.cartData && typeof data.cartData === 'object') {
    dataManagerEvent.cartData = data.cartData as Event['cartData'];
  }

  // Event name (for GA4)
  if (isString(data?.eventName) && data.eventName) {
    dataManagerEvent.eventName = data.eventName.substring(0, 40);
  }

  // Event source
  if (isString(data?.eventSource) && data.eventSource) {
    dataManagerEvent.eventSource = data.eventSource as Event['eventSource'];
  }

  // Consent
  const consent = formatConsent(event.consent);
  if (consent) {
    dataManagerEvent.consent = consent;
  }

  return dataManagerEvent;
}
