import { destinationGtag } from '../index';
import type { Settings } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';

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
  const mockEnv: DestinationWeb.Environment = {
    window: {
      gtag: jest.fn(),
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

  describe('destinationGtag', () => {
    it('should have correct type', () => {
      expect(destinationGtag.type).toBe('google-gtag');
    });

    it('should have empty default config', () => {
      expect(destinationGtag.config).toEqual({ settings: {} });
    });

    it('should have default environment', () => {
      expect(destinationGtag.env).toBeDefined();
      expect(destinationGtag.env.window).toBeDefined();
      expect(destinationGtag.env.document).toBeDefined();
    });
  });

  describe('init', () => {
    it('should return false when no tools are configured', () => {
      const config = { settings: {} };

      const result = destinationGtag.init({ config, env: mockEnv });

      expect(result).toBe(false);
    });

    it('should initialize GA4 only', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings, loadScript: true };

      const result = destinationGtag.init({ config, env: mockEnv });

      expect(result).toBe(config);
      expect(initGA4).toHaveBeenCalledWith(settings.ga4, true, mockEnv);
      expect(initAds).not.toHaveBeenCalled();
      expect(initGTM).not.toHaveBeenCalled();
    });

    it('should initialize Google Ads only', () => {
      const settings: Settings = {
        ads: { conversionId: 'AW-XXXXXXXXX' },
      };
      const config = { settings, loadScript: true };

      const result = destinationGtag.init({ config, env: mockEnv });

      expect(result).toBe(config);
      expect(initAds).toHaveBeenCalledWith(settings.ads, true, mockEnv);
      expect(initGA4).not.toHaveBeenCalled();
      expect(initGTM).not.toHaveBeenCalled();
    });

    it('should initialize GTM only', () => {
      const settings: Settings = {
        gtm: { containerId: 'GTM-XXXXXXX' },
      };
      const config = { settings, loadScript: true };

      const result = destinationGtag.init({ config, env: mockEnv });

      expect(result).toBe(config);
      expect(initGTM).toHaveBeenCalledWith(settings.gtm, true, mockEnv);
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

      const result = destinationGtag.init({ config, env: mockEnv });

      expect(result).toBe(config);
      expect(initGA4).toHaveBeenCalledWith(settings.ga4, true, mockEnv);
      expect(initAds).toHaveBeenCalledWith(settings.ads, true, mockEnv);
      expect(initGTM).toHaveBeenCalledWith(settings.gtm, true, mockEnv);
    });

    it('should pass loadScript parameter correctly', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings, loadScript: false };

      destinationGtag.init({ config, env: mockEnv });

      expect(initGA4).toHaveBeenCalledWith(settings.ga4, false, mockEnv);
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
        env: mockEnv,
      });

      expect(pushGA4Event).toHaveBeenCalledWith(
        mockEvent,
        settings.ga4,
        mapping.settings.ga4,
        mockData,
        mockEnv,
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
        env: mockEnv,
      });

      expect(pushAdsEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.ads,
        mapping.settings.ads,
        mockData,
        'PURCHASE_CONVERSION',
        mockEnv,
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
        env: mockEnv,
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
        env: mockEnv,
      });

      expect(pushGTMEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.gtm,
        mapping.settings.gtm,
        mockData,
        mockEnv,
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
        env: mockEnv,
      });

      expect(pushGA4Event).toHaveBeenCalledWith(
        mockEvent,
        settings.ga4,
        mapping.settings.ga4,
        mockData,
        mockEnv,
      );
      expect(pushAdsEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.ads,
        mapping.settings.ads,
        mockData,
        'PURCHASE_CONVERSION',
        mockEnv,
      );
      expect(pushGTMEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.gtm,
        mapping.settings.gtm,
        mockData,
        mockEnv,
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
          env: mockEnv,
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
        env: mockEnv,
      });

      expect(pushGA4Event).toHaveBeenCalledWith(
        mockEvent,
        settings.ga4,
        undefined,
        mockData,
        mockEnv,
      );
    });
  });
});
