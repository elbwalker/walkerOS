import { addScript, initializeGtag, resetLoadedScripts } from '../shared/gtag';
import {
  normalizeEventName,
  normalizeParamName,
  getData,
} from '../shared/mapping';
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

    // A first-party serving path maps to the id inside the server container,
    // so the id must not be appended.
    it('should use a custom src verbatim, without appending the id', () => {
      addScript('G-XXXXXXXXXX', 'https://custom.domain.com/tag_serving_path/');

      expect(mockScript.src).toBe(
        'https://custom.domain.com/tag_serving_path/',
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

    it('should handle single words', () => {
      expect(normalizeEventName('purchase')).toBe('purchase');
      expect(normalizeEventName('PURCHASE')).toBe('purchase');
    });

    // GA4 accepts event names its own docs call invalid, and live properties
    // report on names carrying a space. Renaming them would break the reports,
    // audiences and conversions already built on them, so an opted-out name
    // goes out exactly as configured.
    it('should return the name untouched when snakeCase is false', () => {
      expect(normalizeEventName('Page View', false)).toBe('Page View');
      expect(normalizeEventName('checkout-login view', false)).toBe(
        'checkout-login view',
      );
    });
  });

  describe('normalizeParamName', () => {
    it('should replace an illegal character with an underscore', () => {
      expect(normalizeParamName('data_creative-type')).toBe(
        'data_creative_type',
      );
    });

    it('should collapse a run of illegal characters into one underscore', () => {
      expect(normalizeParamName('data_a--b')).toBe('data_a_b');
    });

    // GA4 param names are case-sensitive and uppercase is legal. Lowercasing
    // would rename params that report correctly today.
    it('should preserve case', () => {
      expect(normalizeParamName('data_articleNo')).toBe('data_articleNo');
    });

    // GA4's documented 40-character cap and leading-letter rule are not
    // enforced here. Its real ingestion is more permissive than its docs, so
    // rewriting on those rules alone risks renaming a param that reports today.
    it('should not truncate a long name', () => {
      expect(normalizeParamName('a'.repeat(50))).toHaveLength(50);
    });

    it('should not rewrite a leading digit or underscore', () => {
      expect(normalizeParamName('_data_id')).toBe('_data_id');
      expect(normalizeParamName('2fa_enabled')).toBe('2fa_enabled');
    });

    it('should return an empty string only for an empty name', () => {
      expect(normalizeParamName('')).toBe('');
      expect(normalizeParamName('---')).toBe('_');
    });

    it('should leave an already valid name untouched', () => {
      expect(normalizeParamName('item_list_name')).toBe('item_list_name');
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
