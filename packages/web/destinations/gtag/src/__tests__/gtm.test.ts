import { initGTM, pushGTMEvent } from '../gtm';
import { examples } from '../index';
import { clone } from '@walkeros/core';
import type { GTMSettings } from '../types';
import { DestinationWeb } from '@walkeros/web-core';

describe('GTM Implementation', () => {
  const mockDataLayer: unknown[] = [];
  const mockEnv = clone(examples.env.standard);
  mockEnv.window.dataLayer = mockDataLayer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataLayer.length = 0; // Clear array
  });

  describe('initGTM', () => {
    it('should initialize GTM and push init event', () => {
      const settings: GTMSettings = { containerId: 'GTM-XXXXXXX' };

      initGTM(settings, true, mockEnv);

      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toEqual({
        'gtm.start': expect.any(Number),
        event: 'gtm.js',
      });
    });

    it('should use custom dataLayer name', () => {
      const customDataLayer: unknown[] = [];
      const customEnv = clone(examples.env.standard);
      customEnv.window = { customDataLayer };

      const settings: GTMSettings = {
        containerId: 'GTM-XXXXXXX',
        dataLayer: 'customDataLayer',
      };

      initGTM(settings, true, customEnv);

      expect(customDataLayer).toHaveLength(1);
      expect(customDataLayer[0]).toEqual({
        'gtm.start': expect.any(Number),
        event: 'gtm.js',
      });
    });

    it('should still push init event when loadScript is false', () => {
      const settings: GTMSettings = { containerId: 'GTM-XXXXXXX' };

      initGTM(settings, false, mockEnv);

      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toEqual({
        'gtm.start': expect.any(Number),
        event: 'gtm.js',
      });
    });
  });

  describe('pushGTMEvent', () => {
    const mockEvent = {
      name: 'product view',
      entity: 'product',
      action: 'view',
      data: { id: 'product-1', name: 'Test Product' },
    };

    const settings: GTMSettings = { containerId: 'GTM-XXXXXXX' };

    it('should push event to dataLayer', () => {
      pushGTMEvent(mockEvent as any, settings, {}, {}, mockEnv);

      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toEqual({
        event: 'product view',
      });
    });

    it('should push event with data when data is object', () => {
      const data = { price: 99.99, currency: 'USD' };

      pushGTMEvent(mockEvent as any, settings, {}, data, mockEnv);

      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toEqual({
        event: 'product view',
        price: 99.99,
        currency: 'USD',
      });
    });

    it('should fallback to event object when data is not an object', () => {
      pushGTMEvent(
        mockEvent as any,
        settings,
        {},
        'invalid-data' as any,
        mockEnv,
      );

      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toEqual({
        event: 'product view',
        name: 'product view',
        entity: 'product',
        action: 'view',
        data: { id: 'product-1', name: 'Test Product' },
      });
    });

    it('should handle custom dataLayer name in environment', () => {
      const customDataLayer: unknown[] = [];
      const customEnv: DestinationWeb.Env = {
        window: {
          dataLayer: customDataLayer,
        },
        document: mockEnv.document,
      };

      pushGTMEvent(mockEvent as any, settings, {}, {}, customEnv);

      expect(customDataLayer).toHaveLength(1);
      expect(customDataLayer[0]).toEqual({
        event: 'product view',
      });
    });
  });
});
