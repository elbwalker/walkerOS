import { sourceCmpName, DEFAULT_CATEGORY_MAP } from '../index';
import * as inputs from '../examples/inputs';
import * as outputs from '../examples/outputs';
import {
  createMockElb,
  createMockWindow,
  createCmpSource,
  ConsentCall,
} from './test-utils';

/**
 * Test suite template for CMP sources.
 * 8 describe blocks, ~22 tests as skeleton.
 *
 * TODO: Rename describe block and add CMP-specific tests (25-32 total).
 * TODO: Replace 'cmp_init' / 'cmp_consent' with your CMP's event names.
 */

describe('[CmpName] Source', () => {
  let consentCalls: ConsentCall[];
  let mockElb: ReturnType<typeof createMockElb>;

  beforeEach(() => {
    consentCalls = [];
    mockElb = createMockElb(consentCalls);
  });

  describe('initialization', () => {
    test('initializes without errors', async () => {
      const mockWindow = createMockWindow();

      await expect(createCmpSource(mockWindow, mockElb)).resolves.not.toThrow();
    });

    test('returns correct source type', async () => {
      const mockWindow = createMockWindow();
      const source = await createCmpSource(mockWindow, mockElb);

      expect(source.type).toBe('cmp-name'); // TODO: Your CMP type
    });

    test('uses default settings when none provided', async () => {
      const mockWindow = createMockWindow();
      const source = await createCmpSource(mockWindow, mockElb);

      expect(source.config.settings?.categoryMap).toEqual(DEFAULT_CATEGORY_MAP);
      expect(source.config.settings?.explicitOnly).toBe(true);
    });

    test('merges custom settings with defaults', async () => {
      const mockWindow = createMockWindow();
      const source = await createCmpSource(mockWindow, mockElb, {
        settings: {
          categoryMap: { performance: 'statistics' },
          explicitOnly: false,
        },
      });

      expect(source.config.settings?.categoryMap?.performance).toBe(
        'statistics',
      );
      expect(source.config.settings?.explicitOnly).toBe(false);
    });
  });

  describe('existing consent processing', () => {
    test('processes existing consent on initialization', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('does not process null consent with explicitOnly=true', async () => {
      const mockWindow = createMockWindow(null);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(0);
    });

    test('processes null consent with explicitOnly=false', async () => {
      const mockWindow = createMockWindow(null);

      await createCmpSource(mockWindow, mockElb, {
        settings: { explicitOnly: false },
      });

      // Null has no categories to map
      expect(consentCalls).toHaveLength(0);
    });
  });

  describe('category mapping', () => {
    test('maps full consent correctly', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('maps partial consent correctly', async () => {
      const mockWindow = createMockWindow(inputs.partialConsent);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.partialConsentMapped);
    });

    test('maps minimal consent correctly', async () => {
      const mockWindow = createMockWindow(inputs.minimalConsent);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);
    });

    test('maps analytics only consent correctly', async () => {
      const mockWindow = createMockWindow(inputs.analyticsOnly);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.analyticsOnlyMapped);
    });

    test('maps marketing only consent correctly', async () => {
      const mockWindow = createMockWindow(inputs.marketingOnly);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.marketingOnlyMapped);
    });
  });

  describe('custom category mapping', () => {
    test('uses custom category mapping', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);

      await createCmpSource(mockWindow, mockElb, {
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
      const customConsent = { necessary: true, custom_category: true };
      const mockWindow = createMockWindow(customConsent);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual({
        functional: true,
        custom_category: true,
      });
    });
  });

  describe('event handling', () => {
    test('handles init event', async () => {
      const mockWindow = createMockWindow(null);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(0);

      // CMP loads and user accepts
      mockWindow.__setConsent(inputs.fullConsent);
      mockWindow.__dispatchEvent('cmp_init'); // TODO: Your init event

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('handles consent change event', async () => {
      const mockWindow = createMockWindow(inputs.minimalConsent);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(1);

      // User updates consent
      mockWindow.__dispatchEvent('cmp_consent', inputs.fullConsent); // TODO: Your consent event

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual(outputs.fullConsentMapped);
    });

    test('handles multiple consent changes', async () => {
      const mockWindow = createMockWindow(inputs.minimalConsent);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(1);

      mockWindow.__dispatchEvent('cmp_consent', inputs.partialConsent);
      expect(consentCalls).toHaveLength(2);

      mockWindow.__dispatchEvent('cmp_consent', inputs.fullConsent);
      expect(consentCalls).toHaveLength(3);
      expect(consentCalls[2].consent).toEqual(outputs.fullConsentMapped);
    });
  });

  describe('consent revocation', () => {
    test('handles consent withdrawal (full to partial)', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);

      await createCmpSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);

      // User revokes marketing and analytics
      mockWindow.__dispatchEvent('cmp_consent', inputs.revocationInput);

      expect(consentCalls[1].consent.marketing).toBe(false); // explicit false
      expect(consentCalls[1].consent.analytics).toBe(false); // explicit false
    });

    test('handles consent withdrawal (full to minimal)', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);

      await createCmpSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('cmp_consent', inputs.minimalConsent);

      expect(consentCalls[1].consent).toEqual(outputs.minimalConsentMapped);
    });
  });

  describe('cleanup', () => {
    test('destroy removes event listeners', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);

      const source = await createCmpSource(mockWindow, mockElb);

      await source.destroy?.();

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'cmp_init', // TODO: Your init event
        expect.any(Function),
      );
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'cmp_consent', // TODO: Your consent event
        expect.any(Function),
      );
    });

    // TODO: For callback-based CMPs, add test verifying wrapped functions
    // are restored to their originals after destroy
  });

  describe('no window environment', () => {
    test('handles missing window gracefully', async () => {
      const source = await sourceCmpName({
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
        id: 'test-cmp-source',
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

      expect(source.type).toBe('cmp-name'); // TODO: Your CMP type
      expect(consentCalls).toHaveLength(0);
    });
  });
});
