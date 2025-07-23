import { destinationGtag } from '../index';
import type { Settings } from '../types';

// Mock all tool implementations
jest.mock('../ga4', () => ({
  initGA4: jest.fn(),
  pushGA4Event: jest.fn(),
}));

jest.mock('../ads', () => ({
  initAds: jest.fn(),
  pushAdsEvent: jest.fn(),
}));

jest.mock('../gtm', () => ({
  initGTM: jest.fn(),
  pushGTMEvent: jest.fn(),
}));

import { initGA4, pushGA4Event } from '../ga4';
import { initAds, pushAdsEvent } from '../ads';
import { initGTM, pushGTMEvent } from '../gtm';

describe('Unified Gtag Destination', () => {
  const mockWrap = jest.fn((name, fn) => fn);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('destinationGtag', () => {
    it('should have correct type', () => {
      expect(destinationGtag.type).toBe('google-gtag');
    });

    it('should have empty default config', () => {
      expect(destinationGtag.config).toEqual({ settings: {} });
    });
  });

  describe('init', () => {
    it('should return false if no tools are configured', () => {
      const config = { settings: {} };

      const result = destinationGtag.init({ config, wrap: mockWrap });

      expect(result).toBe(false);
      expect(initGA4).not.toHaveBeenCalled();
      expect(initAds).not.toHaveBeenCalled();
      expect(initGTM).not.toHaveBeenCalled();
    });

    it('should initialize GA4 only', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings, loadScript: true };

      const result = destinationGtag.init({ config, wrap: mockWrap });

      expect(result).toBe(config);
      expect(initGA4).toHaveBeenCalledWith(settings.ga4, mockWrap, true);
      expect(initAds).not.toHaveBeenCalled();
      expect(initGTM).not.toHaveBeenCalled();
    });

    it('should initialize Google Ads only', () => {
      const settings: Settings = {
        ads: { conversionId: 'AW-XXXXXXXXX' },
      };
      const config = { settings, loadScript: true };

      const result = destinationGtag.init({ config, wrap: mockWrap });

      expect(result).toBe(config);
      expect(initAds).toHaveBeenCalledWith(settings.ads, mockWrap, true);
      expect(initGA4).not.toHaveBeenCalled();
      expect(initGTM).not.toHaveBeenCalled();
    });

    it('should initialize GTM only', () => {
      const settings: Settings = {
        gtm: { containerId: 'GTM-XXXXXXX' },
      };
      const config = { settings, loadScript: true };

      const result = destinationGtag.init({ config, wrap: mockWrap });

      expect(result).toBe(config);
      expect(initGTM).toHaveBeenCalledWith(settings.gtm, mockWrap, true);
      expect(initGA4).not.toHaveBeenCalled();
      expect(initAds).not.toHaveBeenCalled();
    });

    it('should initialize all tools when configured', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
        ads: { conversionId: 'AW-XXXXXXXXX' },
        gtm: { containerId: 'GTM-XXXXXXX' },
      };
      const config = { settings, loadScript: true };

      const result = destinationGtag.init({ config, wrap: mockWrap });

      expect(result).toBe(config);
      expect(initGA4).toHaveBeenCalledWith(settings.ga4, mockWrap, true);
      expect(initAds).toHaveBeenCalledWith(settings.ads, mockWrap, true);
      expect(initGTM).toHaveBeenCalledWith(settings.gtm, mockWrap, true);
    });

    it('should pass loadScript parameter correctly', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings, loadScript: false };

      destinationGtag.init({ config, wrap: mockWrap });

      expect(initGA4).toHaveBeenCalledWith(settings.ga4, mockWrap, false);
    });
  });

  describe('push', () => {
    const mockEvent = {
      event: 'product view',
      entity: 'product',
      action: 'view',
      data: { id: 'product-1', name: 'Test Product' },
    };

    const mockData = { custom_param: 'custom_value' };

    it('should push to GA4 when configured', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings };
      const mapping = { settings: { ga4: { include: ['data'] as const } } };

      destinationGtag.push(mockEvent as any, {
        config,
        mapping,
        data: mockData,
        wrap: mockWrap,
      });

      expect(pushGA4Event).toHaveBeenCalledWith(
        mockEvent,
        settings.ga4,
        mapping.settings.ga4,
        mockData,
        mockWrap,
      );
    });

    it('should push to Google Ads when configured with mapping name', () => {
      const settings: Settings = {
        ads: { conversionId: 'AW-XXXXXXXXX' },
      };
      const config = { settings };
      const mapping = {
        name: 'PURCHASE_CONVERSION',
        settings: { ads: {} },
      };

      destinationGtag.push(mockEvent as any, {
        config,
        mapping,
        data: mockData,
        wrap: mockWrap,
      });

      expect(pushAdsEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.ads,
        mapping.settings.ads,
        mockData,
        mockWrap,
        'PURCHASE_CONVERSION',
      );
    });

    it('should not push to Google Ads without mapping name', () => {
      const settings: Settings = {
        ads: { conversionId: 'AW-XXXXXXXXX' },
      };
      const config = { settings };
      const mapping = { settings: { ads: {} } };

      destinationGtag.push(mockEvent as any, {
        config,
        mapping,
        data: mockData,
        wrap: mockWrap,
      });

      expect(pushAdsEvent).not.toHaveBeenCalled();
    });

    it('should push to GTM when configured', () => {
      const settings: Settings = {
        gtm: { containerId: 'GTM-XXXXXXX' },
      };
      const config = { settings };
      const mapping = { settings: { gtm: {} } };

      destinationGtag.push(mockEvent as any, {
        config,
        mapping,
        data: mockData,
        wrap: mockWrap,
      });

      expect(pushGTMEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.gtm,
        mapping.settings.gtm,
        mockData,
        mockWrap,
      );
    });

    it('should push to all tools when configured', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
        ads: { conversionId: 'AW-XXXXXXXXX' },
        gtm: { containerId: 'GTM-XXXXXXX' },
      };
      const config = { settings };
      const mapping = {
        name: 'PURCHASE_CONVERSION',
        settings: {
          ga4: { include: ['data'] as const },
          ads: {},
          gtm: {},
        },
      };

      destinationGtag.push(mockEvent as any, {
        config,
        mapping,
        data: mockData,
        wrap: mockWrap,
      });

      expect(pushGA4Event).toHaveBeenCalledWith(
        mockEvent,
        settings.ga4,
        mapping.settings.ga4,
        mockData,
        mockWrap,
      );
      expect(pushAdsEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.ads,
        mapping.settings.ads,
        mockData,
        mockWrap,
        'PURCHASE_CONVERSION',
      );
      expect(pushGTMEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.gtm,
        mapping.settings.gtm,
        mockData,
        mockWrap,
      );
    });

    it('should handle empty mapping gracefully', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings };

      expect(() => {
        destinationGtag.push(mockEvent as any, {
          config,
          mapping: {},
          data: mockData,
          wrap: mockWrap,
        });
      }).not.toThrow();
    });

    it('should handle undefined mapping settings', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings };
      const mapping = {};

      destinationGtag.push(mockEvent as any, {
        config,
        mapping,
        data: mockData,
        wrap: mockWrap,
      });

      expect(pushGA4Event).toHaveBeenCalledWith(
        mockEvent,
        settings.ga4,
        undefined,
        mockData,
        mockWrap,
      );
    });
  });
});
