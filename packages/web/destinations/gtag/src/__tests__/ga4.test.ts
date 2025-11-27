import { initGA4, pushGA4Event } from '../ga4';
import { examples } from '../dev';
import { clone, createMockLogger } from '@walkeros/core';
import type { GA4Settings } from '../types';

describe('GA4 Implementation', () => {
  const mockGtag = jest.fn();
  const mockEnv = clone(examples.env.push);
  mockEnv.window.gtag = mockGtag;

  // Create a mock logger that actually throws
  const createThrowingLogger = () => {
    const logger = createMockLogger();
    logger.throw = (message: string) => {
      throw new Error(message);
    };
    return logger;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initGA4', () => {
    it('should throw error if no measurementId', () => {
      const settings: GA4Settings = { measurementId: '' };
      const logger = createThrowingLogger();

      expect(() => initGA4(settings, undefined, mockEnv, logger)).toThrow(
        'Config settings ga4.measurementId missing',
      );
    });

    it('should initialize GA4 with basic settings', () => {
      const settings: GA4Settings = { measurementId: 'G-XXXXXXXXXX' };

      initGA4(settings, true, mockEnv);

      expect(mockGtag).toHaveBeenCalledWith('js', expect.any(Date));
      expect(mockGtag).toHaveBeenCalledWith('config', 'G-XXXXXXXXXX', {});
    });

    it('should initialize GA4 with transport_url', () => {
      const settings: GA4Settings = {
        measurementId: 'G-XXXXXXXXXX',
        transport_url: 'https://example.com/gtag',
      };

      initGA4(settings, false, mockEnv);

      expect(mockGtag).toHaveBeenCalledWith('config', 'G-XXXXXXXXXX', {
        transport_url: 'https://example.com/gtag',
      });
    });

    it('should initialize GA4 with server_container_url', () => {
      const settings: GA4Settings = {
        measurementId: 'G-XXXXXXXXXX',
        server_container_url: 'https://example.com/gtm',
      };

      initGA4(settings, false, mockEnv);

      expect(mockGtag).toHaveBeenCalledWith('config', 'G-XXXXXXXXXX', {
        server_container_url: 'https://example.com/gtm',
      });
    });

    it('should disable pageview when pageview is false', () => {
      const settings: GA4Settings = {
        measurementId: 'G-XXXXXXXXXX',
        pageview: false,
      };

      initGA4(settings, false, mockEnv);

      expect(mockGtag).toHaveBeenCalledWith('config', 'G-XXXXXXXXXX', {
        send_page_view: false,
      });
    });
  });

  describe('pushGA4Event', () => {
    const mockEvent = {
      name: 'page view',
      data: {},
      timestamp: 1234567890,
      id: 'test-id',
    } as any;

    it('should throw error if no measurementId', () => {
      const settings: GA4Settings = { measurementId: '' };
      const logger = createThrowingLogger();

      expect(() =>
        pushGA4Event(mockEvent, settings, {}, {}, mockEnv, logger),
      ).toThrow('Config settings ga4.measurementId missing');
    });

    it('should push event with snake_case name by default', () => {
      const settings: GA4Settings = { measurementId: 'G-TEST123' };

      pushGA4Event(mockEvent, settings, {}, { value: 123.45 }, mockEnv);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        expect.objectContaining({
          send_to: 'G-TEST123',
          value: 123.45,
        }),
      );
    });

    it('should push event with custom data', () => {
      const settings: GA4Settings = { measurementId: 'G-TEST123' };

      pushGA4Event(
        mockEvent,
        settings,
        {},
        { price: 99.99, currency: 'USD' },
        mockEnv,
      );

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        expect.objectContaining({
          send_to: 'G-TEST123',
          price: 99.99,
          currency: 'USD',
        }),
      );
    });

    it('should push event with debug mode enabled', () => {
      const settings: GA4Settings = {
        measurementId: 'G-TEST123',
        debug: true,
      };

      pushGA4Event(mockEvent, settings, {}, {}, mockEnv);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'page_view',
        expect.objectContaining({
          send_to: 'G-TEST123',
          debug_mode: true,
        }),
      );
    });

    it('should preserve original event name when snakeCase is disabled', () => {
      const settings: GA4Settings = {
        measurementId: 'G-TEST123',
        snakeCase: false,
      };

      pushGA4Event(mockEvent, settings, {}, {}, mockEnv);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'page view',
        expect.objectContaining({
          send_to: 'G-TEST123',
        }),
      );
    });
  });
});
