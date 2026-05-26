import type { Collector } from '@walkeros/core';
import { getEvent } from '@walkeros/core';
import type { AdsSettings } from '../types';
import { resolveUserData } from '../ads/userData';

describe('resolveUserData', () => {
  const mockCollector = {} as Collector.Instance;

  describe('mapping', () => {
    const settings: AdsSettings = {
      conversionId: 'AW-123456789',
      enhancedConversions: {
        email: 'data.customerEmail',
        phone_number: 'data.customerPhone',
      },
    };

    it('should resolve mapped values', async () => {
      const event = getEvent('order complete', {
        data: {
          id: '0rd3r1d',
          total: 555,
          customerEmail: 'buyer@shop.com',
          customerPhone: '+1234567890',
        },
      });

      const result = await resolveUserData(event, settings, mockCollector);

      expect(result).toEqual({
        email: 'buyer@shop.com',
        phone_number: '+1234567890',
      });
    });

    it('should resolve from event.user when mapped there', async () => {
      const userSettings: AdsSettings = {
        conversionId: 'AW-123456789',
        enhancedConversions: {
          email: 'user.email',
          phone_number: 'user.phone',
        },
      };
      const event = getEvent('order complete', {
        user: { email: 'user@example.com', phone: '+1234567890' },
      });

      const result = await resolveUserData(event, userSettings, mockCollector);

      expect(result).toEqual({
        email: 'user@example.com',
        phone_number: '+1234567890',
      });
    });

    it('should resolve address sub-object mapping', async () => {
      const settingsWithAddress: AdsSettings = {
        conversionId: 'AW-123456789',
        enhancedConversions: {
          address: {
            city: 'data.city',
            country: 'data.country',
          },
        },
      };

      const event = getEvent('order complete', {
        data: {
          id: '0rd3r1d',
          total: 555,
          city: 'Berlin',
          country: 'DE',
        },
      });

      const result = await resolveUserData(
        event,
        settingsWithAddress,
        mockCollector,
      );

      expect(result).toEqual({
        address: {
          city: 'Berlin',
          country: 'DE',
        },
      });
    });

    it('should skip fields that resolve to nothing', async () => {
      const event = getEvent('order complete', {
        data: { id: '0rd3r1d', total: 555, customerEmail: 'buyer@shop.com' },
      });

      const result = await resolveUserData(event, settings, mockCollector);

      expect(result).toEqual({ email: 'buyer@shop.com' });
    });

    it('should return undefined when no mapped fields resolve', async () => {
      const event = getEvent('order complete', {
        data: { id: '0rd3r1d', total: 555 },
      });

      const result = await resolveUserData(event, settings, mockCollector);

      expect(result).toBeUndefined();
    });
  });

  describe('no enhanced conversions', () => {
    it('should return undefined when enhancedConversions is not configured', async () => {
      const settings: AdsSettings = {
        conversionId: 'AW-123456789',
      };
      const event = getEvent('order complete');

      const result = await resolveUserData(event, settings, mockCollector);

      expect(result).toBeUndefined();
    });
  });
});
