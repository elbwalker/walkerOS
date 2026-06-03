import { initGTM, pushGTMEvent } from '../gtm';
import { examples } from '../dev';
import { clone, getEvent } from '@walkeros/core';
import type { GTMSettings, Env } from '../types';

describe('GTM Implementation', () => {
  const mockDataLayer: unknown[] = [];
  const mockEnv = clone(examples.env.push);
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
      const customEnv = clone(examples.env.push);
      // Custom dataLayer name - implementation indexes window[name].
      // Augment via Object.assign to avoid replacing the whole window typing.
      Object.assign(customEnv.window, { customDataLayer });

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
    const mockEvent = getEvent('product view', {
      data: { id: 'product-1', name: 'Test Product' },
    });

    const settings: GTMSettings = { containerId: 'GTM-XXXXXXX' };

    it('should push event to dataLayer', () => {
      pushGTMEvent(mockEvent, settings, {}, {}, mockEnv);

      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toEqual({
        event: 'product view',
      });
    });

    it('should push event with data when data is object', () => {
      const data = { price: 99.99, currency: 'USD' };

      pushGTMEvent(mockEvent, settings, {}, data, mockEnv);

      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toEqual({
        event: 'product view',
        price: 99.99,
        currency: 'USD',
      });
    });

    it('should fallback to event object when data is not an object', () => {
      // pushGTMEvent guards isObject(data) at runtime, falling back to the
      // event when data is not an object. A non-object exercises that guard.
      pushGTMEvent(mockEvent, settings, {}, 'invalid-data', mockEnv);

      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toEqual({ event: mockEvent.name, ...mockEvent });
    });

    it('should handle custom dataLayer name in environment', () => {
      const customDataLayer: unknown[] = [];
      const customEnv: Env = {
        window: {
          dataLayer: customDataLayer,
        },
        document: mockEnv.document,
      };

      pushGTMEvent(mockEvent, settings, {}, {}, customEnv);

      expect(customDataLayer).toHaveLength(1);
      expect(customDataLayer[0]).toEqual({
        event: 'product view',
      });
    });
  });
});
