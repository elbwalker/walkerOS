import { addScript, initializeGtag, resetLoadedScripts } from '../shared/gtag';
import { normalizeEventName, getData } from '../shared/mapping';
import type { WalkerOS, Collector } from '@walkeros/core';
import type { WindowWithDataLayer } from '../types';

// The real DOM Window has hundreds of members irrelevant to these unit tests,
// so widen a minimal object to the typed shape initializeGtag expects.
const widen = <T>(value: unknown): T => value as T;
const makeGtagWindow = (
  init: { dataLayer?: unknown[]; gtag?: Gtag.Gtag } = {},
): WindowWithDataLayer => widen(init);

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
      const win = makeGtagWindow();

      initializeGtag(win);

      expect(win.dataLayer).toEqual([]);
    });

    it('should not override existing dataLayer', () => {
      const existingData = [{ test: 'data' }];
      const win = makeGtagWindow({ dataLayer: existingData });

      initializeGtag(win);

      expect(win.dataLayer).toBe(existingData);
    });

    it('should create gtag function if not exists', () => {
      const win = makeGtagWindow();

      initializeGtag(win);

      expect(typeof win.gtag).toBe('function');
    });

    it('should not override existing gtag function', () => {
      const existingGtag = jest.fn();
      const win = makeGtagWindow({ gtag: existingGtag });

      initializeGtag(win);

      expect(win.gtag).toBe(existingGtag);
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

  describe('getData', () => {
    it('should merge data with proper priority', async () => {
      const mockEvent = { name: 'test', data: {} } as WalkerOS.Event;
      const baseData = { id: 'product-1' };
      const config = {};
      const toolSettings = undefined;
      const mockCollector = {} as Collector.Instance;

      const result = await getData(
        mockEvent,
        baseData,
        config,
        toolSettings,
        mockCollector,
      );
      expect(result.id).toBe('product-1');
    });
  });
});
