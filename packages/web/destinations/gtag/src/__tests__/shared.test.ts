import {
  addScript,
  initializeGtag,
  getGtag,
  resetLoadedScripts,
} from '../shared/gtag';
import { getParamsInclude } from '../shared/parameters';
import { normalizeEventName } from '../shared/mapping';

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

describe('Shared Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).dataLayer = [];
    (window as any).gtag = undefined;
    mockCreateElement.mockReturnValue(mockScript);
    resetLoadedScripts();
    mockScript.src = ''; // Reset script src
  });

  describe('addScript', () => {
    it('should create and append script with correct src', () => {
      addScript('G-XXXXXXXXXX');

      expect(mockCreateElement).toHaveBeenCalledWith('script');
      expect(mockScript.src).toBe(
        'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX',
      );
      expect(mockAppendChild).toHaveBeenCalledWith(mockScript);
    });

    it('should use custom src when provided', () => {
      addScript('G-XXXXXXXXXX', 'https://custom.domain.com/gtag/js?id=');

      expect(mockScript.src).toBe(
        'https://custom.domain.com/gtag/js?id=G-XXXXXXXXXX',
      );
    });

    it('should not load the same script twice', () => {
      addScript('G-XXXXXXXXXX');
      addScript('G-XXXXXXXXXX');

      expect(mockAppendChild).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeGtag', () => {
    it('should initialize dataLayer if not exists', () => {
      delete (window as any).dataLayer;

      initializeGtag();

      expect((window as any).dataLayer).toEqual([]);
    });

    it('should not override existing dataLayer', () => {
      const existingData = [{ test: 'data' }];
      (window as any).dataLayer = existingData;

      initializeGtag();

      expect((window as any).dataLayer).toBe(existingData);
    });

    it('should create gtag function if not exists', () => {
      initializeGtag();

      expect(typeof (window as any).gtag).toBe('function');
    });

    it('should not override existing gtag function', () => {
      const existingGtag = jest.fn();
      (window as any).gtag = existingGtag;

      initializeGtag();

      expect((window as any).gtag).toBe(existingGtag);
    });
  });

  describe('getGtag', () => {
    it('should return wrapped gtag function', () => {
      const mockGtag = jest.fn();
      const mockWrap = jest.fn(() => mockGtag);
      (window as any).gtag = jest.fn();

      const result = getGtag(mockWrap);

      expect(mockWrap).toHaveBeenCalledWith('gtag', (window as any).gtag);
      expect(result).toBe(mockGtag);
    });
  });

  describe('getParamsInclude', () => {
    const mockEvent = {
      id: 'event-id',
      timing: 123,
      trigger: 'manual',
      entity: 'product',
      action: 'view',
      data: { id: 'product-1', name: 'Test Product' },
      context: { page: ['home'] },
      user: { id: 'user-1' },
    };

    it('should include specified groups', () => {
      const result = getParamsInclude(mockEvent as any, ['data', 'user']);

      expect(result).toEqual({
        data_id: 'product-1',
        data_name: 'Test Product',
        user_id: 'user-1',
      });
    });

    it('should include event properties when event group specified', () => {
      const result = getParamsInclude(mockEvent as any, ['event']);

      expect(result).toEqual({
        event_id: 'event-id',
        event_timing: 123,
        event_trigger: 'manual',
        event_entity: 'product',
        event_action: 'view',
        event_group: undefined,
        event_count: undefined,
      });
    });

    it('should handle context properties correctly', () => {
      const result = getParamsInclude(mockEvent as any, ['context']);

      expect(result).toEqual({
        context_page: 'home',
      });
    });

    it('should expand "all" to all groups', () => {
      const result = getParamsInclude(mockEvent as any, ['all']);

      expect(result).toHaveProperty('data_id');
      expect(result).toHaveProperty('user_id');
      expect(result).toHaveProperty('context_page');
      expect(result).toHaveProperty('event_id');
    });
  });

  describe('normalizeEventName', () => {
    it('should convert to snake_case by default', () => {
      expect(normalizeEventName('Page View')).toBe('page_view');
      expect(normalizeEventName('Add To Cart')).toBe('add_to_cart');
    });

    it('should return original name when snakeCase is false', () => {
      expect(normalizeEventName('Page View', false)).toBe('Page View');
    });

    it('should handle single words', () => {
      expect(normalizeEventName('purchase')).toBe('purchase');
      expect(normalizeEventName('PURCHASE')).toBe('purchase');
    });
  });
});
