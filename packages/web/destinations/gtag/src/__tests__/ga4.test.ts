import { initGA4, pushGA4Event } from '../ga4';
import type { GA4Settings } from '../types';

// Mock the shared utilities
jest.mock('../shared/gtag', () => ({
  addScript: jest.fn(),
  initializeGtag: jest.fn(),
  getGtag: jest.fn(() => jest.fn()),
}));

import { addScript, initializeGtag, getGtag } from '../shared/gtag';

describe('GA4 Implementation', () => {
  const mockWrap = jest.fn((name, fn) => fn);
  const mockGtag = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getGtag as jest.Mock).mockReturnValue(mockGtag);
  });

  describe('initGA4', () => {
    it('should return early if no measurementId', () => {
      const settings: GA4Settings = { measurementId: '' };

      initGA4(settings, mockWrap);

      expect(addScript).not.toHaveBeenCalled();
      expect(initializeGtag).not.toHaveBeenCalled();
    });

    it('should initialize GA4 with basic settings', () => {
      const settings: GA4Settings = { measurementId: 'G-XXXXXXXXXX' };

      initGA4(settings, mockWrap, true);

      expect(addScript).toHaveBeenCalledWith('G-XXXXXXXXXX');
      expect(initializeGtag).toHaveBeenCalled();
      expect(mockGtag).toHaveBeenCalledWith('js', expect.any(Date));
      expect(mockGtag).toHaveBeenCalledWith('config', 'G-XXXXXXXXXX', {});
    });

    it('should handle custom settings', () => {
      const settings: GA4Settings = {
        measurementId: 'G-XXXXXXXXXX',
        transport_url: 'https://custom.endpoint.com',
        server_container_url: 'https://server.container.com',
        pageview: false,
      };

      initGA4(settings, mockWrap, true);

      expect(mockGtag).toHaveBeenCalledWith('config', 'G-XXXXXXXXXX', {
        transport_url: 'https://custom.endpoint.com',
        server_container_url: 'https://server.container.com',
        send_page_view: false,
      });
    });

    it('should not load script if loadScript is false', () => {
      const settings: GA4Settings = { measurementId: 'G-XXXXXXXXXX' };

      initGA4(settings, mockWrap, false);

      expect(addScript).not.toHaveBeenCalled();
      expect(initializeGtag).toHaveBeenCalled();
    });
  });

  describe('pushGA4Event', () => {
    const mockEvent = {
      event: 'product view',
      entity: 'product',
      action: 'view',
      data: { id: 'product-1', name: 'Test Product' },
    };

    const settings: GA4Settings = {
      measurementId: 'G-XXXXXXXXXX',
    };

    it('should return early if no measurementId', () => {
      const emptySettings: GA4Settings = { measurementId: '' };

      pushGA4Event(mockEvent as any, emptySettings, {}, {}, mockWrap);

      expect(mockGtag).not.toHaveBeenCalled();
    });

    it('should push event with correct parameters', () => {
      pushGA4Event(mockEvent as any, settings, {}, {}, mockWrap);

      expect(mockGtag).toHaveBeenCalledWith('event', 'product_view', {
        data_id: 'product-1',
        data_name: 'Test Product',
        send_to: 'G-XXXXXXXXXX',
      });
    });

    it('should include debug mode when enabled', () => {
      const debugSettings: GA4Settings = {
        ...settings,
        debug: true,
      };

      pushGA4Event(mockEvent as any, debugSettings, {}, {}, mockWrap);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'product_view',
        expect.objectContaining({
          debug_mode: true,
          send_to: 'G-XXXXXXXXXX',
        }),
      );
    });

    it('should not convert to snake_case when disabled', () => {
      const noSnakeCaseSettings: GA4Settings = {
        ...settings,
        snakeCase: false,
      };

      pushGA4Event(mockEvent as any, noSnakeCaseSettings, {}, {}, mockWrap);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'product view',
        expect.any(Object),
      );
    });

    it('should merge event data with additional data', () => {
      const additionalData = { custom_param: 'custom_value' };

      pushGA4Event(mockEvent as any, settings, {}, additionalData, mockWrap);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'product_view',
        expect.objectContaining({
          custom_param: 'custom_value',
          data_id: 'product-1',
          data_name: 'Test Product',
        }),
      );
    });

    it('should use custom include settings from mapping', () => {
      const mapping = { include: ['context', 'user'] as const };
      const eventWithContext = {
        ...mockEvent,
        context: { page: ['home'] },
        user: { id: 'user-1' },
      };

      pushGA4Event(eventWithContext as any, settings, mapping, {}, mockWrap);

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'product_view',
        expect.objectContaining({
          context_page: 'home',
          user_id: 'user-1',
          send_to: 'G-XXXXXXXXXX',
        }),
      );
    });
  });
});
