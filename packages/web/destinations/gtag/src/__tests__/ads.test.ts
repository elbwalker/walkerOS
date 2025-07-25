import { initAds, pushAdsEvent } from '../ads';
import type { AdsSettings, AdsMapping } from '../types';

// Mock the shared utilities
jest.mock('../shared/gtag', () => ({
  addScript: jest.fn(),
  initializeGtag: jest.fn(),
  getGtag: jest.fn(() => jest.fn()),
}));

import { addScript, initializeGtag, getGtag } from '../shared/gtag';

describe('Google Ads Implementation', () => {
  const mockWrap = jest.fn((name, fn) => fn);
  const mockGtag = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getGtag as jest.Mock).mockReturnValue(mockGtag);
  });

  describe('initAds', () => {
    it('should return early if no conversionId', () => {
      const settings: AdsSettings = { conversionId: '' };

      initAds(settings, mockWrap);

      expect(addScript).not.toHaveBeenCalled();
      expect(initializeGtag).not.toHaveBeenCalled();
    });

    it('should initialize Ads with basic settings', () => {
      const settings: AdsSettings = { conversionId: 'AW-XXXXXXXXX' };

      initAds(settings, mockWrap, true);

      expect(addScript).toHaveBeenCalledWith('AW-XXXXXXXXX');
      expect(initializeGtag).toHaveBeenCalled();
      expect(mockGtag).toHaveBeenCalledWith('js', expect.any(Date));
      expect(mockGtag).toHaveBeenCalledWith('config', 'AW-XXXXXXXXX');
    });

    it('should set default currency to EUR', () => {
      const settings: AdsSettings = { conversionId: 'AW-XXXXXXXXX' };

      initAds(settings, mockWrap, true);

      expect(settings.currency).toBe('EUR');
    });

    it('should not override existing currency', () => {
      const settings: AdsSettings = {
        conversionId: 'AW-XXXXXXXXX',
        currency: 'EUR',
      };

      initAds(settings, mockWrap, true);

      expect(settings.currency).toBe('EUR');
    });

    it('should not load script if loadScript is false', () => {
      const settings: AdsSettings = { conversionId: 'AW-XXXXXXXXX' };

      initAds(settings, mockWrap, false);

      expect(addScript).not.toHaveBeenCalled();
      expect(initializeGtag).toHaveBeenCalled();
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
      pushAdsEvent(mockEvent as any, settings, {}, {}, mockWrap);

      expect(mockGtag).not.toHaveBeenCalled();
    });

    it('should push conversion event with correct parameters', () => {
      const mappingName = 'PURCHASE_CONVERSION';

      pushAdsEvent(mockEvent as any, settings, {}, {}, mockWrap, mappingName);

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
        mockWrap,
        mappingName,
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
        mockWrap,
        mappingName,
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
        mockWrap,
        mappingName,
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
        mockWrap,
        mappingName,
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
        mockWrap,
        mappingName,
      );

      expect(mockGtag).toHaveBeenCalledWith('event', 'conversion', {
        send_to: 'AW-XXXXXXXXX/FALLBACK_LABEL',
        currency: 'EUR',
      });
    });

    it('should return early when neither mapping.label nor mappingName is provided', () => {
      const mapping: AdsMapping = {};

      pushAdsEvent(mockEvent as any, settings, mapping, {}, mockWrap);

      expect(mockGtag).not.toHaveBeenCalled();
    });
  });
});
