import { initAds, pushAdsEvent } from '../ads';
import type { AdsSettings, AdsMapping } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';

describe('Google Ads Implementation', () => {
  const mockGtag = jest.fn();
  const mockEnv: DestinationWeb.Environment = {
    window: {
      gtag: mockGtag,
      dataLayer: [],
    },
    document: {
      createElement: jest.fn(() => ({
        src: '',
        setAttribute: jest.fn(),
        removeAttribute: jest.fn(),
      })),
      head: { appendChild: jest.fn() },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initAds', () => {
    it('should return early if no conversionId', () => {
      const settings: AdsSettings = { conversionId: '' };

      initAds(settings, undefined, mockEnv);

      expect(mockGtag).not.toHaveBeenCalled();
    });

    it('should initialize Ads with basic settings', () => {
      const settings: AdsSettings = { conversionId: 'AW-XXXXXXXXX' };

      initAds(settings, true, mockEnv);

      expect(mockGtag).toHaveBeenCalledWith('js', expect.any(Date));
      expect(mockGtag).toHaveBeenCalledWith('config', 'AW-XXXXXXXXX');
    });

    it('should set default currency to EUR', () => {
      const settings: AdsSettings = { conversionId: 'AW-XXXXXXXXX' };

      initAds(settings, true, mockEnv);

      expect(settings.currency).toBe('EUR');
    });

    it('should not override existing currency', () => {
      const settings: AdsSettings = {
        conversionId: 'AW-XXXXXXXXX',
        currency: 'EUR',
      };

      initAds(settings, true, mockEnv);

      expect(settings.currency).toBe('EUR');
    });

    it('should still initialize gtag when loadScript is false', () => {
      const settings: AdsSettings = { conversionId: 'AW-XXXXXXXXX' };

      initAds(settings, false, mockEnv);

      expect(mockGtag).toHaveBeenCalledWith('js', expect.any(Date));
      expect(mockGtag).toHaveBeenCalledWith('config', 'AW-XXXXXXXXX');
    });
  });

  describe('pushAdsEvent', () => {
    const mockEvent = {
      event: 'order complete',
      entity: 'order',
      action: 'complete',
      data: { id: 'order-123', total: 99.99 },
    };

    const settings: AdsSettings = {
      conversionId: 'AW-XXXXXXXXX',
      currency: 'EUR',
    };

    it('should return early if no mapping name', () => {
      pushAdsEvent(mockEvent as any, settings, {}, {}, undefined, mockEnv);

      expect(mockGtag).not.toHaveBeenCalled();
    });

    it('should push conversion event with correct parameters', () => {
      const mappingName = 'PURCHASE_CONVERSION';

      pushAdsEvent(mockEvent as any, settings, {}, {}, mappingName, mockEnv);

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
        mockEvent as any,
        settings,
        {},
        additionalData,
        mappingName,
        mockEnv,
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
        mockEvent as any,
        settingsWithoutCurrency,
        {},
        {},
        mappingName,
        mockEnv,
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/PURCHASE_CONVERSION',
        currency: 'EUR',
      });
    });

    it('should handle non-object data gracefully', () => {
      const mappingName = 'PURCHASE_CONVERSION';

      pushAdsEvent(
        mockEvent as any,
        settings,
        {},
        'invalid-data',
        mappingName,
        mockEnv,
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
        mockEvent as any,
        settings,
        mapping,
        {},
        mappingName,
        mockEnv,
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
        mockEvent as any,
        settings,
        mapping,
        {},
        mappingName,
        mockEnv,
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/FALLBACK_LABEL',
        currency: 'EUR',
      });
    });

    it('should return early when neither mapping.label nor mappingName is provided', () => {
      const mapping: AdsMapping = {};

      pushAdsEvent(mockEvent as any, settings, mapping, {}, undefined, mockEnv);

      expect(mockGtag).not.toHaveBeenCalled();
    });
  });
});
