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
    test('extracts gclid from context', () => {
      const event = getEvent('page view');
      event.context = { gclid: ['TeSter', 0] };

      const result = formatAdIdentifiers(event);

      expect(result).toEqual({
        gclid: 'TeSter',
      });
    });

    test('extracts gbraid and wbraid', () => {
      const event = getEvent('page view');
      event.context = {
        gbraid: ['ios-attribution-id', 0],
        wbraid: ['web-to-app-id', 0],
      };

      const result = formatAdIdentifiers(event);

      expect(result).toEqual({
        gbraid: 'ios-attribution-id',
        wbraid: 'web-to-app-id',
      });
    });

    test('extracts sessionAttributes', () => {
      const event = getEvent('page view');
      event.context = {
        sessionAttributes: ['gad_source=1&gad_campaignid=123', 0],
      };

      const result = formatAdIdentifiers(event);

      expect(result).toEqual({
        sessionAttributes: 'gad_source=1&gad_campaignid=123',
      });
    });

    test('prioritizes context over data', () => {
      const event = getEvent('page view');
      event.context = { gclid: ['context-gclid', 0] };
      event.data = { gclid: 'data-gclid' };

      const result = formatAdIdentifiers(event);

      expect(result?.gclid).toBe('context-gclid');
    });

    test('falls back to data properties', () => {
      const event = getEvent('page view');
      event.data = { gclid: 'data-gclid' };

      const result = formatAdIdentifiers(event);

      expect(result?.gclid).toBe('data-gclid');
    });

    test('falls back to globals', () => {
      const event = getEvent('page view');
      event.globals = { gclid: ['global-gclid', 0] };

      const result = formatAdIdentifiers(event);

      expect(result?.gclid).toBe('global-gclid');
    });

    test('returns undefined when no identifiers found', () => {
      const event = getEvent('page view');

      const result = formatAdIdentifiers(event);

      expect(result).toBeUndefined();
    });
  });

  describe('formatUserData', () => {
    test('extracts and hashes email from user.id', async () => {
      const event = getEvent('page view');
      event.user = { id: 'user@example.com' };

      const result = await formatUserData(event);

      expect(result).toBeDefined();
      expect(result?.userIdentifiers).toHaveLength(1);
      expect(result?.userIdentifiers[0]).toHaveProperty('emailAddress');
    });

    test('extracts and hashes email from data.email', async () => {
      const event = getEvent('page view');
      event.data = { email: 'test@example.com' };

      const result = await formatUserData(event);

      expect(result).toBeDefined();
      expect(result?.userIdentifiers).toHaveLength(1);
      expect(result?.userIdentifiers[0]).toHaveProperty('emailAddress');
    });

    test('extracts and hashes phone from data.phone', async () => {
      const event = getEvent('page view');
      event.data = { phone: '+1234567890' };

      const result = await formatUserData(event);

      expect(result).toBeDefined();
      expect(result?.userIdentifiers).toHaveLength(1);
      expect(result?.userIdentifiers[0]).toHaveProperty('phoneNumber');
    });

    test('extracts address with hashed names', async () => {
      const event = getEvent('page view');
      event.data = {
        firstName: 'John',
        lastName: 'Doe',
        regionCode: 'us',
        postalCode: '12345',
      };

      const result = await formatUserData(event);

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

    test('limits to 10 identifiers', async () => {
      const event = getEvent('page view');
      event.user = { id: 'user@example.com' };
      event.data = {
        email: 'test1@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        regionCode: 'us',
        postalCode: '12345',
      };

      const result = await formatUserData(event);

      expect(result).toBeDefined();
      expect(result?.userIdentifiers.length).toBeLessThanOrEqual(10);
    });

    test('returns undefined when no identifiers found', async () => {
      const event = getEvent('page view');

      const result = await formatUserData(event);

      expect(result).toBeUndefined();
    });
  });

  describe('formatEvent', () => {
    test('formats complete event', async () => {
      const event = getEvent('order complete');
      (event.data as Record<string, unknown>).transactionId = 'TXN-123';
      (event.data as Record<string, unknown>).conversionValue = 99.99;
      (event.data as Record<string, unknown>).currency = 'usd';

      const result = await formatEvent(event);

      expect(result).toMatchObject({
        eventTimestamp: expect.any(String),
        transactionId: 'TXN-123',
        conversionValue: 99.99,
        currency: 'USD', // Uppercased
      });
    });

    test('uses event.id as fallback transactionId', async () => {
      const event = getEvent('page view');

      const result = await formatEvent(event);

      expect(result.transactionId).toBe(event.id);
    });

    test('extracts userId from event.user.id', async () => {
      const event = getEvent('page view');
      event.user = { id: 'user-123' };

      const result = await formatEvent(event);

      expect(result.userId).toBe('user-123');
    });

    test('includes clientId when provided', async () => {
      const event = getEvent('page view');
      (event.data as Record<string, unknown>).clientId = 'GA-CLIENT-123';

      const result = await formatEvent(event);

      expect(result.clientId).toBe('GA-CLIENT-123');
    });

    test('includes eventName when provided', async () => {
      const event = getEvent('page view');
      (event.data as Record<string, unknown>).eventName = 'page_view';

      const result = await formatEvent(event);

      expect(result.eventName).toBe('page_view');
    });

    test('includes eventSource when provided', async () => {
      const event = getEvent('page view');
      (event.data as Record<string, unknown>).eventSource = 'WEB';

      const result = await formatEvent(event);

      expect(result.eventSource).toBe('WEB');
    });

    test('includes consent when present', async () => {
      const event = getEvent('page view');
      event.consent = { marketing: true, personalization: false };

      const result = await formatEvent(event);

      expect(result.consent).toEqual({
        adUserData: 'CONSENT_GRANTED',
        adPersonalization: 'CONSENT_DENIED',
      });
    });

    test('handles mapped data override', async () => {
      const event = getEvent('page view');
      const mappedData = {
        transactionId: 'MAPPED-123',
        conversionValue: 199.99,
        currency: 'EUR',
      };

      const result = await formatEvent(event, mappedData);

      expect(result).toMatchObject({
        transactionId: 'MAPPED-123',
        conversionValue: 199.99,
        currency: 'EUR',
      });
    });

    test('uses value as fallback for conversionValue', async () => {
      const event = getEvent('order complete');
      (event.data as Record<string, unknown>).value = 149.99;

      const result = await formatEvent(event);

      expect(result.conversionValue).toBe(149.99);
    });

    test('uses total as fallback for conversionValue', async () => {
      const event = getEvent('order complete');
      (event.data as Record<string, unknown>).total = 249.99;

      const result = await formatEvent(event);

      expect(result.conversionValue).toBe(249.99);
    });

    test('truncates long transactionId to 512 chars', async () => {
      const longId = 'A'.repeat(1000);
      const event = getEvent('page view');
      (event.data as Record<string, unknown>).transactionId = longId;

      const result = await formatEvent(event);

      expect(result.transactionId?.length).toBe(512);
    });

    test('truncates long currency to 3 chars', async () => {
      const event = getEvent('page view');
      (event.data as Record<string, unknown>).currency = 'TOOLONG';

      const result = await formatEvent(event);

      expect(result.currency?.length).toBe(3);
    });
  });
});
