import { getEvent } from '@walkeros/core';
import {
  formatTimestamp,
  formatConsent,
  formatAdIdentifiers,
  formatUserData,
  formatEvent,
} from '../format';

describe('format utilities', () => {
  describe('formatTimestamp', () => {
    test('formats timestamp to RFC 3339', () => {
      const timestamp = 1647261462000; // 2022-03-14T10:57:42.000Z
      const result = formatTimestamp(timestamp);

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(result).getTime()).toBe(timestamp);
    });
  });

  describe('formatConsent', () => {
    test('maps marketing consent to adUserData', () => {
      const consent = { marketing: true };
      const result = formatConsent(consent);

      expect(result).toEqual({
        adUserData: 'CONSENT_GRANTED',
      });
    });

    test('maps personalization consent to adPersonalization', () => {
      const consent = { personalization: false };
      const result = formatConsent(consent);

      expect(result).toEqual({
        adPersonalization: 'CONSENT_DENIED',
      });
    });

    test('maps both consent types', () => {
      const consent = { marketing: true, personalization: false };
      const result = formatConsent(consent);

      expect(result).toEqual({
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_DENIED',
      });
    });

    test('returns undefined for no consent', () => {
      expect(formatConsent(undefined)).toBeUndefined();
      expect(formatConsent({})).toBeUndefined();
    });
  });

  describe('formatAdIdentifiers', () => {
    test('extracts gclid from mapped data', () => {
      const data = { gclid: 'TeSter' };

      const result = formatAdIdentifiers(data);

      expect(result).toEqual({
        gclid: 'TeSter',
      });
    });

    test('extracts gbraid and wbraid', () => {
      const data = {
        gbraid: 'ios-attribution-id',
        wbraid: 'web-to-app-id',
      };

      const result = formatAdIdentifiers(data);

      expect(result).toEqual({
        gbraid: 'ios-attribution-id',
        wbraid: 'web-to-app-id',
      });
    });

    test('extracts sessionAttributes', () => {
      const data = {
        sessionAttributes: 'gad_source=1&gad_campaignid=123',
      };

      const result = formatAdIdentifiers(data);

      expect(result).toEqual({
        sessionAttributes: 'gad_source=1&gad_campaignid=123',
      });
    });

    test('extracts all identifiers', () => {
      const data = {
        gclid: 'test-gclid',
        gbraid: 'test-gbraid',
        wbraid: 'test-wbraid',
        sessionAttributes: 'gad_source=1',
      };

      const result = formatAdIdentifiers(data);

      expect(result).toEqual({
        gclid: 'test-gclid',
        gbraid: 'test-gbraid',
        wbraid: 'test-wbraid',
        sessionAttributes: 'gad_source=1',
      });
    });

    test('ignores non-string values', () => {
      const data = {
        gclid: 123, // Not a string
        gbraid: null,
        wbraid: undefined,
      };

      const result = formatAdIdentifiers(data);

      expect(result).toBeUndefined();
    });

    test('returns undefined when no identifiers found', () => {
      const data = {};

      const result = formatAdIdentifiers(data);

      expect(result).toBeUndefined();
    });
  });

  describe('formatUserData', () => {
    test('extracts and hashes email from mapped data', async () => {
      const data = { email: 'user@example.com' };

      const result = await formatUserData(data);

      expect(result).toBeDefined();
      expect(result?.userIdentifiers).toHaveLength(1);
      expect(result?.userIdentifiers[0]).toHaveProperty('emailAddress');
    });

    test('extracts and hashes phone from mapped data', async () => {
      const data = { phone: '+1234567890' };

      const result = await formatUserData(data);

      expect(result).toBeDefined();
      expect(result?.userIdentifiers).toHaveLength(1);
      expect(result?.userIdentifiers[0]).toHaveProperty('phoneNumber');
    });

    test('extracts address with hashed names', async () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        regionCode: 'us',
        postalCode: '12345',
      };

      const result = await formatUserData(data);

      expect(result).toBeDefined();
      expect(result?.userIdentifiers).toHaveLength(1);
      const addressIdentifier = result?.userIdentifiers[0] as {
        address: Record<string, string>;
      };
      expect(addressIdentifier).toHaveProperty('address');
      expect(addressIdentifier.address).toHaveProperty('givenName');
      expect(addressIdentifier.address).toHaveProperty('familyName');
      expect(addressIdentifier.address.regionCode).toBe('US'); // Uppercased
      expect(addressIdentifier.address.postalCode).toBe('12345'); // Not hashed
    });

    test('combines multiple user identifiers', async () => {
      const data = {
        email: 'test@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        regionCode: 'us',
        postalCode: '12345',
      };

      const result = await formatUserData(data);

      expect(result).toBeDefined();
      expect(result?.userIdentifiers.length).toBe(3); // email, phone, address
      expect(result?.userIdentifiers.length).toBeLessThanOrEqual(10);
    });

    test('returns undefined when no identifiers found', async () => {
      const data = {};

      const result = await formatUserData(data);

      expect(result).toBeUndefined();
    });
  });

  describe('formatEvent', () => {
    test('formats complete event with mapped data', async () => {
      const event = getEvent('order complete');
      const mappedData = {
        transactionId: 'TXN-123',
        conversionValue: 99.99,
        currency: 'usd',
      };

      const result = await formatEvent(event, mappedData);

      expect(result).toMatchObject({
        eventTimestamp: expect.any(String),
        transactionId: 'TXN-123',
        conversionValue: 99.99,
        currency: 'USD', // Uppercased
      });
    });

    test('returns only timestamp when no mapped data', async () => {
      const event = getEvent('page view');

      const result = await formatEvent(event);

      expect(result).toEqual({
        eventTimestamp: expect.any(String),
      });
      expect(result.transactionId).toBeUndefined();
      expect(result.userId).toBeUndefined();
    });

    test('includes userId when mapped', async () => {
      const event = getEvent('page view');
      const mappedData = { userId: 'user-123' };

      const result = await formatEvent(event, mappedData);

      expect(result.userId).toBe('user-123');
    });

    test('includes clientId when mapped', async () => {
      const event = getEvent('page view');
      const mappedData = { clientId: 'GA-CLIENT-123' };

      const result = await formatEvent(event, mappedData);

      expect(result.clientId).toBe('GA-CLIENT-123');
    });

    test('includes eventName when mapped', async () => {
      const event = getEvent('page view');
      const mappedData = { eventName: 'page_view' };

      const result = await formatEvent(event, mappedData);

      expect(result.eventName).toBe('page_view');
    });

    test('includes eventSource when mapped', async () => {
      const event = getEvent('page view');
      const mappedData = { eventSource: 'WEB' };

      const result = await formatEvent(event, mappedData);

      expect(result.eventSource).toBe('WEB');
    });

    test('includes consent when present in event', async () => {
      const event = getEvent('page view');
      event.consent = { marketing: true, personalization: false };

      const result = await formatEvent(event);

      expect(result.consent).toEqual({
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_DENIED',
      });
    });

    test('includes user data when mapped', async () => {
      const event = getEvent('page view');
      const mappedData = {
        email: 'test@example.com',
        phone: '+1234567890',
      };

      const result = await formatEvent(event, mappedData);

      expect(result.userData).toBeDefined();
      expect(result.userData?.userIdentifiers).toHaveLength(2);
    });

    test('truncates long transactionId to 512 chars', async () => {
      const longId = 'A'.repeat(1000);
      const event = getEvent('page view');
      const mappedData = { transactionId: longId };

      const result = await formatEvent(event, mappedData);

      expect(result.transactionId?.length).toBe(512);
    });

    test('truncates long currency to 3 chars', async () => {
      const event = getEvent('page view');
      const mappedData = { currency: 'TOOLONG' };

      const result = await formatEvent(event, mappedData);

      expect(result.currency?.length).toBe(3);
    });

    test('includes all fields when fully mapped', async () => {
      const event = getEvent('order complete');
      event.consent = { marketing: true };
      const mappedData = {
        transactionId: 'ORDER-123',
        userId: 'user-456',
        clientId: 'GA-789',
        email: 'customer@example.com',
        conversionValue: 299.99,
        currency: 'USD',
        eventName: 'purchase',
        eventSource: 'WEB',
        gclid: 'test-gclid',
      };

      const result = await formatEvent(event, mappedData);

      expect(result).toMatchObject({
        eventTimestamp: expect.any(String),
        transactionId: 'ORDER-123',
        userId: 'user-456',
        clientId: 'GA-789',
        conversionValue: 299.99,
        currency: 'USD',
        eventName: 'purchase',
        eventSource: 'WEB',
        consent: {
          adUserData: 'CONSENT_GRANTED',
        },
      });
      expect(result.userData).toBeDefined();
      expect(result.adIdentifiers).toEqual({ gclid: 'test-gclid' });
    });
  });
});
