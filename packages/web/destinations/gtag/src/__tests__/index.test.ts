import { destinationGtag, resetConsentState } from '../index';
import { examples } from '../dev';
import type { Settings, Rule, Include } from '../types';
import { type WalkerOS, type Collector } from '@walkeros/core';
import { clone, createMockLogger } from '@walkeros/core';

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
  const mockEnv = examples.env.push;
  const mockCollector = {} as Collector.Instance;

  // Create a mock logger that actually throws
  const createThrowingLogger = () => {
    const logger = createMockLogger();
    logger.throw = (message: string) => {
      throw new Error(message);
    };
    return logger;
  };
  const mockLogger = createThrowingLogger();

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

    it('should not have default environment', () => {
      expect(destinationGtag.env).toBeUndefined();
    });
  });

  describe('init', () => {
    it('should throw when no tools are configured', () => {
      const config = { settings: {} };

      expect(() =>
        destinationGtag.init!({
          config,
          env: mockEnv,
          collector: mockCollector,
          logger: mockLogger,
        }),
      ).toThrow('Config settings missing');
    });

    it('should initialize GA4 only', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings, loadScript: true };

      const result = destinationGtag.init!({
        config,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(result).toBe(config);
      expect(initGA4).toHaveBeenCalledWith(
        settings.ga4,
        true,
        mockEnv,
        mockLogger,
      );
      expect(initAds).not.toHaveBeenCalled();
      expect(initGTM).not.toHaveBeenCalled();
    });

    it('should initialize Google Ads only', () => {
      const settings: Settings = {
        ads: { conversionId: 'AW-XXXXXXXXX' },
      };
      const config = { settings, loadScript: true };

      const result = destinationGtag.init!({
        config,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(result).toBe(config);
      expect(initAds).toHaveBeenCalledWith(
        settings.ads,
        true,
        mockEnv,
        mockLogger,
      );
      expect(initGA4).not.toHaveBeenCalled();
      expect(initGTM).not.toHaveBeenCalled();
    });

    it('should initialize GTM only', () => {
      const settings: Settings = {
        gtm: { containerId: 'GTM-XXXXXXX' },
      };
      const config = { settings, loadScript: true };

      const result = destinationGtag.init!({
        config,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(result).toBe(config);
      expect(initGTM).toHaveBeenCalledWith(
        settings.gtm,
        true,
        mockEnv,
        mockLogger,
      );
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

      const result = destinationGtag.init!({
        config,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(result).toBe(config);
      expect(initGA4).toHaveBeenCalledWith(
        settings.ga4,
        true,
        mockEnv,
        mockLogger,
      );
      expect(initAds).toHaveBeenCalledWith(
        settings.ads,
        true,
        mockEnv,
        mockLogger,
      );
      expect(initGTM).toHaveBeenCalledWith(
        settings.gtm,
        true,
        mockEnv,
        mockLogger,
      );
    });

    it('should pass loadScript parameter correctly', () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings, loadScript: false };

      destinationGtag.init!({
        config,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(initGA4).toHaveBeenCalledWith(
        settings.ga4,
        false,
        mockEnv,
        mockLogger,
      );
    });
  });

  describe('push', () => {
    const mockEvent = {
      name: 'product view',
      data: { id: 'product-1', name: 'Test Product' },
    } as any;

    const mockData = { custom_param: 'custom_value' };

    it('should push to GA4 when configured', async () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings };
      const mapping: Rule = { settings: { ga4: { include: ['data'] } } };

      await destinationGtag.push(mockEvent, {
        config,
        mapping,
        data: mockData,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(pushGA4Event).toHaveBeenCalledWith(
        mockEvent,
        settings.ga4,
        mapping.settings?.ga4,
        mockData,
        mockEnv,
        mockLogger,
      );
    });

    it('should push to Google Ads when configured with mapping name', async () => {
      const settings: Settings = {
        ads: { conversionId: 'AW-XXXXXXXXX' },
      };
      const config = { settings };
      const mapping = {
        name: 'PURCHASE_CONVERSION',
        settings: { ads: {} },
      };

      await destinationGtag.push(mockEvent, {
        config,
        mapping,
        data: mockData,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(pushAdsEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.ads,
        mapping.settings.ads,
        mockData,
        'PURCHASE_CONVERSION',
        mockEnv,
        mockLogger,
      );
    });

    it('should not push to Google Ads without mapping name', async () => {
      const settings: Settings = {
        ads: { conversionId: 'AW-XXXXXXXXX' },
      };
      const config = { settings };
      const mapping = { settings: { ads: {} } };

      await destinationGtag.push(mockEvent, {
        config,
        mapping,
        data: mockData,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(pushAdsEvent).not.toHaveBeenCalled();
    });

    it('should push to GTM when configured', async () => {
      const settings: Settings = {
        gtm: { containerId: 'GTM-XXXXXXX' },
      };
      const config = { settings };
      const mapping = { settings: { gtm: {} } };

      await destinationGtag.push(mockEvent, {
        config,
        mapping,
        data: mockData,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(pushGTMEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.gtm,
        mapping.settings.gtm,
        mockData,
        mockEnv,
        mockLogger,
      );
    });

    it('should push to all tools when configured', async () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
        ads: { conversionId: 'AW-XXXXXXXXX' },
        gtm: { containerId: 'GTM-XXXXXXX' },
      };
      const config = { settings };
      const mapping = {
        name: 'PURCHASE_CONVERSION',
        settings: {
          ga4: { include: ['data'] as Include },
          ads: {},
          gtm: {},
        },
      };

      await destinationGtag.push(mockEvent, {
        config,
        mapping,
        data: mockData,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(pushGA4Event).toHaveBeenCalledWith(
        mockEvent,
        settings.ga4,
        mapping.settings?.ga4,
        mockData,
        mockEnv,
        mockLogger,
      );
      expect(pushAdsEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.ads,
        mapping.settings.ads,
        mockData,
        'PURCHASE_CONVERSION',
        mockEnv,
        mockLogger,
      );
      expect(pushGTMEvent).toHaveBeenCalledWith(
        mockEvent,
        settings.gtm,
        mapping.settings.gtm,
        mockData,
        mockEnv,
        mockLogger,
      );
    });

    it('should handle empty mapping gracefully', async () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings };

      await expect(
        destinationGtag.push(mockEvent, {
          config,
          mapping: {},
          data: mockData,
          env: mockEnv,
          collector: mockCollector,
          logger: mockLogger,
        }),
      ).resolves.not.toThrow();
    });

    it('should handle undefined mapping settings', async () => {
      const settings: Settings = {
        ga4: { measurementId: 'G-XXXXXXXXXX' },
      };
      const config = { settings };
      const mapping = {};

      await destinationGtag.push(mockEvent, {
        config,
        mapping,
        data: mockData,
        env: mockEnv,
        collector: mockCollector,
        logger: mockLogger,
      });

      expect(pushGA4Event).toHaveBeenCalledWith(
        mockEvent,
        settings.ga4,
        undefined,
        mockData,
        mockEnv,
        mockLogger,
      );
    });
  });

  describe('Consent Mode', () => {
    const mockGtag = jest.fn();
    let mockEnvWithGtag: any;
    const mockCollector = {} as Collector.Instance;

    beforeEach(() => {
      jest.clearAllMocks();
      resetConsentState();
      mockEnvWithGtag = clone(examples.env.push);
      mockEnvWithGtag.window.gtag = mockGtag;
    });

    describe('Disabled consent mode (como: false)', () => {
      it('should not call gtag consent when como is false', () => {
        // Set up destination with disabled consent mode
        const destination = { ...destinationGtag };
        destination.config = { settings: { como: false } };
        destination.env = mockEnvWithGtag;

        // Call walker consent command
        destination.on?.('consent', {
          collector: mockCollector,
          config: destination.config,
          data: { marketing: true, functional: false },
          env: mockEnvWithGtag,
          logger: mockLogger,
        });

        // Call a regular event
        const event = { name: 'button click', data: { id: 'test-btn' } };
        destination.push(event as any, {
          config: destination.config,
          data: {},
          env: mockEnvWithGtag,
          collector: mockCollector,
          logger: mockLogger,
        });

        // Verify no gtag consent calls were made
        expect(mockGtag).not.toHaveBeenCalledWith(
          'consent',
          expect.any(String),
          expect.any(Object),
        );
      });
    });

    describe('Denied consent', () => {
      it('should call gtag consent default with denied values', async () => {
        // Set up destination with default consent mode
        const destination = { ...destinationGtag };
        destination.config = {
          settings: { como: true, ga4: { measurementId: 'G-TEST123' } },
        };
        destination.env = mockEnvWithGtag;

        // Call walker consent command with denied consent
        destination.on?.('consent', {
          collector: mockCollector,
          config: destination.config,
          data: { marketing: false, functional: false },
          env: mockEnvWithGtag,
          logger: mockLogger,
        });

        // Verify gtag consent default was called with all denied values first
        expect(mockGtag).toHaveBeenCalledWith('consent', 'default', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        });

        // Verify gtag consent update was called with actual denied values
        expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        });

        // Call a regular event
        const event = { name: 'page view', data: { title: 'Test Page' } };
        await destination.push(event as any, {
          config: destination.config,
          data: {},
          env: mockEnvWithGtag,
          collector: mockCollector,
          logger: mockLogger,
        });

        // Verify regular event processing still works
        expect(pushGA4Event).toHaveBeenCalled();
      });

      it('should call gtag consent update on subsequent consent changes', () => {
        // Set up destination with default consent mode
        const destination = { ...destinationGtag };
        destination.config = {
          settings: { como: true, ga4: { measurementId: 'G-TEST123' } },
        };
        destination.env = mockEnvWithGtag;

        // First consent call (should use 'default' then 'update')
        destination.on?.('consent', {
          collector: mockCollector,
          config: destination.config,
          data: { marketing: false, functional: false },
          env: mockEnvWithGtag,
          logger: mockLogger,
        });

        expect(mockGtag).toHaveBeenCalledWith('consent', 'default', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        });

        expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        });

        // Clear mock calls to focus on second call
        mockGtag.mockClear();

        // Second consent call (should only use 'update')
        destination.on?.('consent', {
          collector: mockCollector,
          config: destination.config,
          data: { marketing: false, functional: true },
          env: mockEnvWithGtag,
          logger: mockLogger,
        });

        // Should NOT call default again
        expect(mockGtag).not.toHaveBeenCalledWith(
          'consent',
          'default',
          expect.any(Object),
        );

        // Should call update with new values
        expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'granted',
        });
      });
    });

    describe('Granted consent', () => {
      it('should call gtag consent default with granted values', async () => {
        // Set up destination with default consent mode
        const destination = { ...destinationGtag };
        destination.config = {
          settings: { como: true, ga4: { measurementId: 'G-TEST123' } },
        };
        destination.env = mockEnvWithGtag;

        // Call walker consent command with granted consent
        destination.on?.('consent', {
          collector: mockCollector,
          config: destination.config,
          data: { marketing: true, functional: true },
          env: mockEnvWithGtag,
          logger: mockLogger,
        });

        // Verify gtag consent default was called with all denied values first
        expect(mockGtag).toHaveBeenCalledWith('consent', 'default', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        });

        // Verify gtag consent update was called with actual granted values
        expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
          analytics_storage: 'granted',
        });

        // Call a regular event
        const event = { name: 'order complete', data: { value: 99.99 } };
        await destination.push(event as any, {
          config: destination.config,
          data: {},
          env: mockEnvWithGtag,
          collector: mockCollector,
          logger: mockLogger,
        });

        // Verify regular event processing still works
        expect(pushGA4Event).toHaveBeenCalled();
      });

      it('should handle custom consent mapping', () => {
        // Set up destination with custom consent mapping
        const destination = { ...destinationGtag };
        destination.config = {
          settings: {
            como: {
              marketing: ['ad_storage', 'ad_personalization'],
              analytics: ['analytics_storage'],
            },
            ga4: { measurementId: 'G-TEST123' },
          },
        };
        destination.env = mockEnvWithGtag;

        // Call walker consent command
        destination.on?.('consent', {
          collector: mockCollector,
          config: destination.config,
          data: { marketing: true, analytics: false },
          env: mockEnvWithGtag,
          logger: mockLogger,
        });

        // Verify default consent was called with all denied values first
        expect(mockGtag).toHaveBeenCalledWith('consent', 'default', {
          ad_storage: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        });

        // Verify custom mapping was used in update call
        expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
          ad_storage: 'granted',
          ad_personalization: 'granted',
          analytics_storage: 'denied',
        });
      });

      it('should handle partial consent gracefully', () => {
        // Set up destination with default consent mode
        const destination = { ...destinationGtag };
        destination.config = {
          settings: { como: true, ga4: { measurementId: 'G-TEST123' } },
        };
        destination.env = mockEnvWithGtag;

        // Call walker consent command with only marketing consent
        destination.on?.('consent', {
          collector: mockCollector,
          config: destination.config,
          data: { marketing: true },
          env: mockEnvWithGtag,
          logger: mockLogger,
        });

        // Verify default consent was called with all denied values first
        expect(mockGtag).toHaveBeenCalledWith('consent', 'default', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        });

        // Verify only marketing-related consent was updated
        expect(mockGtag).toHaveBeenCalledWith('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
        });
      });

      it('should ignore unknown consent groups but still set default', () => {
        // Set up destination with default consent mode
        const destination = { ...destinationGtag };
        destination.config = {
          settings: { como: true, ga4: { measurementId: 'G-TEST123' } },
        };
        destination.env = mockEnvWithGtag;

        // Call walker consent command with unknown consent group
        destination.on?.('consent', {
          collector: mockCollector,
          config: destination.config,
          data: { unknown_group: true },
          env: mockEnvWithGtag,
          logger: mockLogger,
        });

        // Verify default consent was called (because mapping has known parameters)
        expect(mockGtag).toHaveBeenCalledWith('consent', 'default', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        });

        // Verify no update call was made since no known groups were provided
        expect(mockGtag).not.toHaveBeenCalledWith(
          'consent',
          'update',
          expect.any(Object),
        );
      });

      it('should not call gtag when consent mapping is empty', () => {
        // Set up destination with empty consent mapping
        const destination = { ...destinationGtag };
        destination.config = {
          settings: {
            como: {}, // Empty mapping
            ga4: { measurementId: 'G-TEST123' },
          },
        };
        destination.env = mockEnvWithGtag;

        // Call walker consent command
        destination.on?.('consent', {
          collector: mockCollector,
          config: destination.config,
          data: { marketing: true },
          env: mockEnvWithGtag,
          logger: mockLogger,
        });

        // Verify no gtag consent calls were made (empty mapping = no parameters)
        expect(mockGtag).not.toHaveBeenCalledWith(
          'consent',
          expect.any(String),
          expect.any(Object),
        );
      });
    });
  });
});
