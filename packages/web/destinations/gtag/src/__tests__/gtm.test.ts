import { initGTM, pushGTMEvent } from '../gtm';
import type { GTMSettings } from '../types';

// Setup DOM mocks
const mockScript = { src: '' };
const mockCreateElement = jest.fn(() => mockScript);
const mockAppendChild = jest.fn();

// Mock document methods
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
  writable: true,
});

Object.defineProperty(document, 'head', {
  value: { appendChild: mockAppendChild },
  writable: true,
});

describe('GTM Implementation', () => {
  const mockWrap = jest.fn((name, fn) => fn);

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).dataLayer = [];
    mockCreateElement.mockReturnValue(mockScript);
  });

  describe('initGTM', () => {
    it('should initialize GTM with basic settings', () => {
      const mockPush = jest.fn();
      mockWrap.mockReturnValue(mockPush);

      const settings: GTMSettings = { containerId: 'GTM-XXXXXXX' };

      initGTM(settings, mockWrap, true);

      expect((window as any).dataLayer).toEqual([]);
      expect(mockWrap).toHaveBeenCalledWith(
        'dataLayer.push',
        expect.any(Function),
      );
      expect(mockPush).toHaveBeenCalledWith({
        'gtm.start': expect.any(Number),
        event: 'gtm.js',
      });
    });

    it('should use custom dataLayer name', () => {
      const settings: GTMSettings = {
        containerId: 'GTM-XXXXXXX',
        dataLayer: 'customDataLayer',
      };

      // Mock custom dataLayer
      (window as any).customDataLayer = [];

      initGTM(settings, mockWrap, true);

      expect((window as any).customDataLayer).toEqual([]);
    });

    it('should not load script if loadScript is false', () => {
      const settings: GTMSettings = { containerId: 'GTM-XXXXXXX' };

      initGTM(settings, mockWrap, false);

      expect(mockAppendChild).not.toHaveBeenCalled();
    });

    it('should load script with custom domain', () => {
      const settings: GTMSettings = {
        containerId: 'GTM-XXXXXXX',
        domain: 'https://custom.gtm.domain.com/gtm.js?id=',
      };

      initGTM(settings, mockWrap, true);

      expect(mockScript.src).toBe(
        'https://custom.gtm.domain.com/gtm.js?id=GTM-XXXXXXX',
      );
    });

    it('should append dataLayer parameter for custom dataLayer', () => {
      const settings: GTMSettings = {
        containerId: 'GTM-XXXXXXX',
        dataLayer: 'customDataLayer',
      };

      initGTM(settings, mockWrap, true);

      expect(mockScript.src).toBe(
        'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX&l=customDataLayer',
      );
    });
  });

  describe('pushGTMEvent', () => {
    const mockEvent = {
      event: 'product view',
      entity: 'product',
      action: 'view',
      data: { id: 'product-1', name: 'Test Product' },
    };

    const settings: GTMSettings = { containerId: 'GTM-XXXXXXX' };

    it('should push event to dataLayer', () => {
      const mockPush = jest.fn();
      mockWrap.mockReturnValue(mockPush);

      pushGTMEvent(mockEvent as any, settings, {}, {}, mockWrap);

      expect(mockPush).toHaveBeenCalledWith({
        event: 'product view',
      });
    });

    it('should merge with additional data when provided', () => {
      const mockPush = jest.fn();
      mockWrap.mockReturnValue(mockPush);

      const additionalData = { custom_param: 'custom_value' };

      pushGTMEvent(mockEvent as any, settings, {}, additionalData, mockWrap);

      expect(mockPush).toHaveBeenCalledWith({
        event: 'product view',
        custom_param: 'custom_value',
      });
    });

    it('should fallback to event data when data is not object', () => {
      const mockPush = jest.fn();
      mockWrap.mockReturnValue(mockPush);

      pushGTMEvent(mockEvent as any, settings, {}, 'invalid-data', mockWrap);

      expect(mockPush).toHaveBeenCalledWith({
        event: 'product view',
        entity: 'product',
        action: 'view',
        data: { id: 'product-1', name: 'Test Product' },
      });
    });
  });
});
