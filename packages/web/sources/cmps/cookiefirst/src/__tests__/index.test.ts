import { sourceCookieFirst, DEFAULT_CATEGORY_MAP } from '../index';
import * as inputs from '../examples/inputs';
import * as outputs from '../examples/outputs';
import {
  createMockElb,
  createMockWindow,
  createCookieFirstSource,
  ConsentCall,
} from './test-utils';

describe('CookieFirst Source', () => {
  let consentCalls: ConsentCall[];
  let mockElb: ReturnType<typeof createMockElb>;

  beforeEach(() => {
    consentCalls = [];
    mockElb = createMockElb(consentCalls);
  });

  describe('initialization', () => {
    test('initializes without errors', async () => {
      const mockWindow = createMockWindow();

      await expect(
        createCookieFirstSource(mockWindow, mockElb),
      ).resolves.not.toThrow();
    });

    test('returns correct source type', async () => {
      const mockWindow = createMockWindow();
      const source = await createCookieFirstSource(mockWindow, mockElb);

      expect(source.type).toBe('cookiefirst');
    });

    test('uses default settings when none provided', async () => {
      const mockWindow = createMockWindow();
      const source = await createCookieFirstSource(mockWindow, mockElb);

      expect(source.config.settings?.categoryMap).toEqual(DEFAULT_CATEGORY_MAP);
      expect(source.config.settings?.explicitOnly).toBe(true);
      expect(source.config.settings?.globalName).toBe('CookieFirst');
    });

    test('merges custom settings with defaults', async () => {
      const mockWindow = createMockWindow();
      const source = await createCookieFirstSource(mockWindow, mockElb, {
        settings: {
          categoryMap: { performance: 'statistics' },
          explicitOnly: false,
        },
      });

      // Custom mapping should override default
      expect(source.config.settings?.categoryMap?.performance).toBe(
        'statistics',
      );
      // Other defaults should remain
      expect(source.config.settings?.categoryMap?.advertising).toBe(
        'marketing',
      );
      expect(source.config.settings?.explicitOnly).toBe(false);
    });
  });

  describe('existing consent processing', () => {
    test('processes existing consent on initialization', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('does not process null consent with explicitOnly=true', async () => {
      const mockWindow = createMockWindow(null);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(0);
    });

    test('processes null consent with explicitOnly=false', async () => {
      const mockWindow = createMockWindow(null);

      await createCookieFirstSource(mockWindow, mockElb, {
        settings: { explicitOnly: false },
      });

      // Still no calls because null has no categories to map
      expect(consentCalls).toHaveLength(0);
    });
  });

  describe('category mapping', () => {
    test('maps full consent correctly', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('maps partial consent correctly', async () => {
      const mockWindow = createMockWindow(inputs.partialConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.partialConsentMapped);
    });

    test('maps minimal consent correctly', async () => {
      const mockWindow = createMockWindow(inputs.minimalConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);
    });

    test('maps analytics only consent correctly', async () => {
      const mockWindow = createMockWindow(inputs.analyticsOnlyConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.analyticsOnlyMapped);
    });

    test('maps marketing only consent correctly', async () => {
      const mockWindow = createMockWindow(inputs.marketingOnlyConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.marketingOnlyMapped);
    });

    test('uses custom category mapping', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);

      await createCookieFirstSource(mockWindow, mockElb, {
        settings: {
          categoryMap: {
            necessary: 'essential',
            functional: 'essential',
            performance: 'statistics',
            advertising: 'ads',
          },
        },
      });

      expect(consentCalls[0].consent).toEqual({
        essential: true,
        statistics: true,
        ads: true,
      });
    });

    test('passes through unmapped categories', async () => {
      const customConsent = {
        necessary: true,
        custom_category: true,
      };
      const mockWindow = createMockWindow(customConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual({
        functional: true,
        custom_category: true,
      });
    });
  });

  describe('event handling', () => {
    test('handles cf_init event', async () => {
      const mockWindow = createMockWindow(null);

      await createCookieFirstSource(mockWindow, mockElb);

      // No consent yet
      expect(consentCalls).toHaveLength(0);

      // Simulate CMP loading and user accepting
      (
        mockWindow as unknown as { __setConsent: (c: unknown) => void }
      ).__setConsent(inputs.fullConsent);
      (
        mockWindow as unknown as { __dispatchEvent: (e: string) => void }
      ).__dispatchEvent('cf_init');

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('handles cf_consent event', async () => {
      const mockWindow = createMockWindow(inputs.minimalConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      // Initial consent
      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);

      // User updates consent
      (
        mockWindow as unknown as {
          __dispatchEvent: (e: string, d: unknown) => void;
        }
      ).__dispatchEvent('cf_consent', inputs.fullConsent);

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual(outputs.fullConsentMapped);
    });

    test('handles multiple consent changes', async () => {
      const mockWindow = createMockWindow(inputs.minimalConsent);

      await createCookieFirstSource(mockWindow, mockElb);

      // Initial
      expect(consentCalls).toHaveLength(1);

      // First change
      (
        mockWindow as unknown as {
          __dispatchEvent: (e: string, d: unknown) => void;
        }
      ).__dispatchEvent('cf_consent', inputs.partialConsent);
      expect(consentCalls).toHaveLength(2);

      // Second change
      (
        mockWindow as unknown as {
          __dispatchEvent: (e: string, d: unknown) => void;
        }
      ).__dispatchEvent('cf_consent', inputs.fullConsent);
      expect(consentCalls).toHaveLength(3);

      expect(consentCalls[2].consent).toEqual(outputs.fullConsentMapped);
    });
  });

  describe('custom global name', () => {
    test('uses custom global name', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent, 'MyCMP');

      await createCookieFirstSource(mockWindow, mockElb, {
        settings: { globalName: 'MyCMP' },
      });

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });
  });

  describe('cleanup', () => {
    test('destroy removes event listeners', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);

      const source = await createCookieFirstSource(mockWindow, mockElb);

      // Initial consent processed
      expect(consentCalls).toHaveLength(1);

      // Destroy the source
      await source.destroy?.();

      // Verify removeEventListener was called
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'cf_init',
        expect.any(Function),
      );
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'cf_consent',
        expect.any(Function),
      );
    });
  });

  describe('no window environment', () => {
    test('handles missing window gracefully', async () => {
      const source = await sourceCookieFirst({
        collector: {} as never,
        config: {},
        env: {
          push: mockElb,
          command: mockElb,
          elb: mockElb,
          window: undefined,
          logger: {
            error: () => {},
            info: () => {},
            debug: () => {},
            throw: (m: string | Error) => {
              throw typeof m === 'string' ? new Error(m) : m;
            },
            scope: function () {
              return this;
            },
          },
        },
        id: 'test-cookiefirst',
        logger: {
          error: () => {},
          info: () => {},
          debug: () => {},
          throw: (m: string | Error) => {
            throw typeof m === 'string' ? new Error(m) : m;
          },
          scope: function () {
            return this;
          },
        },
        setIngest: async () => {},
      });

      expect(source.type).toBe('cookiefirst');
      expect(consentCalls).toHaveLength(0);
    });
  });
});
