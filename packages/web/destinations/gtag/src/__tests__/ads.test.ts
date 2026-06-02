import { initAds, pushAdsEvent } from '../ads';
import { examples } from '../dev';
import { clone, createMockLogger, getEvent } from '@walkeros/core';
import type { AdsSettings, AdsMapping } from '../types';

describe('Google Ads Implementation', () => {
  const mockGtag = jest.fn();
  const mockEnv = clone(examples.env.push);
  mockEnv.window.gtag = mockGtag;

  // Create a mock logger that actually throws
  const createThrowingLogger = () => {
    const logger = createMockLogger();
    logger.throw = jest.fn((message: string | Error): never => {
      const msg = message instanceof Error ? message.message : message;
      throw new Error(msg);
    });
    return logger;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initAds', () => {
    it('should throw error if no conversionId', () => {
      const settings: AdsSettings = { conversionId: '' };
      const logger = createThrowingLogger();

      expect(() => initAds(settings, undefined, mockEnv, logger)).toThrow(
        'Config settings ads.conversionId missing',
      );
    });

    it('should initialize Ads with basic settings', () => {
      const settings: AdsSettings = { conversionId: 'AW-XXXXXXXXX' };

      initAds(settings, true, mockEnv, createMockLogger());

      expect(mockGtag).toHaveBeenCalledWith('js', expect.any(Date));
      expect(mockGtag).toHaveBeenCalledWith('config', 'AW-XXXXXXXXX');
    });

    it('should set default currency to EUR', () => {
      const settings: AdsSettings = { conversionId: 'AW-XXXXXXXXX' };

      initAds(settings, true, mockEnv, createMockLogger());

      expect(settings.currency).toBe('EUR');
    });

    it('should not override existing currency', () => {
      const settings: AdsSettings = {
        conversionId: 'AW-XXXXXXXXX',
        currency: 'EUR',
      };

      initAds(settings, true, mockEnv, createMockLogger());

      expect(settings.currency).toBe('EUR');
    });

    it('should still initialize gtag when loadScript is false', () => {
      const settings: AdsSettings = { conversionId: 'AW-XXXXXXXXX' };

      initAds(settings, false, mockEnv, createMockLogger());

      expect(mockGtag).toHaveBeenCalledWith('js', expect.any(Date));
      expect(mockGtag).toHaveBeenCalledWith('config', 'AW-XXXXXXXXX');
    });

    it('should pass allow_enhanced_conversions when enhancedConversions is configured', () => {
      const settings: AdsSettings = {
        conversionId: 'AW-XXXXXXXXX',
        enhancedConversions: { email: 'user.email' },
      };

      initAds(settings, false, mockEnv, createMockLogger());

      expect(mockGtag).toHaveBeenCalledWith('config', 'AW-XXXXXXXXX', {
        allow_enhanced_conversions: true,
      });
    });

    it('should not pass allow_enhanced_conversions when enhancedConversions is not configured', () => {
      const settings: AdsSettings = { conversionId: 'AW-XXXXXXXXX' };

      initAds(settings, false, mockEnv, createMockLogger());

      expect(mockGtag).toHaveBeenCalledWith('config', 'AW-XXXXXXXXX');
    });
  });

  describe('pushAdsEvent', () => {
    const mockEvent = getEvent('order complete', {
      data: { id: 'order-123', total: 99.99 },
    });

    const settings: AdsSettings = {
      conversionId: 'AW-XXXXXXXXX',
      currency: 'EUR',
    };

    const typedEvent = mockEvent;

    it('should throw error if no mapping name', () => {
      const logger = createThrowingLogger();

      expect(() =>
        pushAdsEvent(mockEvent, settings, {}, {}, undefined, mockEnv, logger),
      ).toThrow('Config mapping ads.label missing');
    });

    it('should push conversion event with correct parameters', () => {
      const mappingName = 'PURCHASE_CONVERSION';

      pushAdsEvent(
        mockEvent,
        settings,
        {},
        {},
        mappingName,
        mockEnv,
        createMockLogger(),
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/PURCHASE_CONVERSION',
        currency: 'EUR',
      });
    });

    it('should merge event data with conversion parameters', () => {
      const mappingName = 'PURCHASE_CONVERSION';
      const additionalData = {
        value: 99.99,
        transaction_id: 'order-123',
      };

      pushAdsEvent(
        mockEvent,
        settings,
        {},
        additionalData,
        mappingName,
        mockEnv,
        createMockLogger(),
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/PURCHASE_CONVERSION',
        currency: 'EUR',
        value: 99.99,
        transaction_id: 'order-123',
      });
    });

    it('should use default EUR currency if not set', () => {
      const settingsWithoutCurrency: AdsSettings = {
        conversionId: 'AW-XXXXXXXXX',
      };
      const mappingName = 'PURCHASE_CONVERSION';

      pushAdsEvent(
        mockEvent,
        settingsWithoutCurrency,
        {},
        {},
        mappingName,
        mockEnv,
        createMockLogger(),
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/PURCHASE_CONVERSION',
        currency: 'EUR',
      });
    });

    it('should handle non-object data gracefully', () => {
      const mappingName = 'PURCHASE_CONVERSION';

      pushAdsEvent(
        mockEvent,
        settings,
        {},
        'invalid-data',
        mappingName,
        mockEnv,
        createMockLogger(),
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/PURCHASE_CONVERSION',
        currency: 'EUR',
      });
    });

    it('should use mapping.label when provided', () => {
      const mapping: AdsMapping = { label: 'MAPPED_LABEL' };
      const mappingName = 'FALLBACK_LABEL';

      pushAdsEvent(
        mockEvent,
        settings,
        mapping,
        {},
        mappingName,
        mockEnv,
        createMockLogger(),
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/MAPPED_LABEL',
        currency: 'EUR',
      });
    });

    it('should fallback to mappingName when mapping.label is not provided', () => {
      const mapping: AdsMapping = {};
      const mappingName = 'FALLBACK_LABEL';

      pushAdsEvent(
        mockEvent,
        settings,
        mapping,
        {},
        mappingName,
        mockEnv,
        createMockLogger(),
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/FALLBACK_LABEL',
        currency: 'EUR',
      });
    });

    it('should throw error when neither mapping.label nor mappingName is provided', () => {
      const mapping: AdsMapping = {};
      const logger = createThrowingLogger();

      expect(() =>
        pushAdsEvent(
          mockEvent,
          settings,
          mapping,
          {},
          undefined,
          mockEnv,
          logger,
        ),
      ).toThrow('Config mapping ads.label missing');
    });

    it('should call gtag set user_data before conversion when userData is provided', () => {
      const mappingName = 'PURCHASE_CONVERSION';
      const userData = {
        email: 'user@example.com',
        phone_number: '+1234567890',
      };

      pushAdsEvent(
        typedEvent,
        settings,
        {},
        {},
        mappingName,
        mockEnv,
        createMockLogger(),
        userData,
      );

      // Verify set user_data is called BEFORE conversion event
      expect(mockGtag).toHaveBeenNthCalledWith(1, 'set', 'user_data', userData);
      expect(mockGtag).toHaveBeenNthCalledWith(2, 'event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/PURCHASE_CONVERSION',
        currency: 'EUR',
      });
    });

    it('should not call gtag set user_data when userData is undefined', () => {
      const mappingName = 'PURCHASE_CONVERSION';

      pushAdsEvent(
        typedEvent,
        settings,
        {},
        {},
        mappingName,
        mockEnv,
        createMockLogger(),
        undefined,
      );

      expect(mockGtag).not.toHaveBeenCalledWith(
        'set',
        'user_data',
        expect.any(Object),
      );
      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/PURCHASE_CONVERSION',
        currency: 'EUR',
      });
    });

    it('should include address in user_data when provided', () => {
      const mappingName = 'PURCHASE_CONVERSION';
      const userData = {
        email: 'user@example.com',
        address: {
          city: 'Hamburg',
          region: 'HH',
          postal_code: '20354',
          country: 'DE',
        },
      };

      pushAdsEvent(
        typedEvent,
        settings,
        {},
        {},
        mappingName,
        mockEnv,
        createMockLogger(),
        userData,
      );

      expect(mockGtag).toHaveBeenCalledWith('set', 'user_data', userData);
    });
  });
});
