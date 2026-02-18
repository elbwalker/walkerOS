import { sourceCookiePro, DEFAULT_CATEGORY_MAP } from '../index';
import * as inputs from '../examples/inputs';
import * as outputs from '../examples/outputs';
import {
  createMockElb,
  createMockWindow,
  createCookieProSource,
  ConsentCall,
} from './test-utils';

describe('CookiePro Source', () => {
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
        createCookieProSource(mockWindow, mockElb),
      ).resolves.not.toThrow();
    });

    test('returns correct source type', async () => {
      const mockWindow = createMockWindow();
      const source = await createCookieProSource(mockWindow, mockElb);

      expect(source.type).toBe('cookiepro');
    });

    test('uses default settings when none provided', async () => {
      const mockWindow = createMockWindow();
      const source = await createCookieProSource(mockWindow, mockElb);

      expect(source.config.settings?.categoryMap).toEqual(DEFAULT_CATEGORY_MAP);
      expect(source.config.settings?.explicitOnly).toBe(true);
      expect(source.config.settings?.globalName).toBe('OneTrust');
    });

    test('merges custom settings with defaults', async () => {
      const mockWindow = createMockWindow();
      const source = await createCookieProSource(mockWindow, mockElb, {
        settings: {
          categoryMap: { C0002: 'statistics' },
          explicitOnly: false,
        },
      });

      // Custom mapping should override default
      expect(source.config.settings?.categoryMap?.C0002).toBe('statistics');
      // Other defaults should remain
      expect(source.config.settings?.categoryMap?.C0004).toBe('marketing');
      expect(source.config.settings?.explicitOnly).toBe(false);
    });
  });

  describe('already loaded consent', () => {
    test('processes existing consent when SDK already loaded', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.fullConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('skips already-loaded consent when explicitOnly and alert box not closed', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: false,
        activeGroups: inputs.minimalConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(0);
    });

    test('processes already-loaded consent when explicitOnly=false regardless of alert box', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: false,
        activeGroups: inputs.minimalConsent,
      });

      await createCookieProSource(mockWindow, mockElb, {
        settings: { explicitOnly: false },
      });

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);
    });

    test('handles SDK loaded but no active groups string', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
      });

      await createCookieProSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(0);
    });
  });

  describe('OptanonWrapper callback', () => {
    test('wraps OptanonWrapper and processes consent on SDK init', async () => {
      const mockWindow = createMockWindow();

      await createCookieProSource(mockWindow, mockElb);

      // Simulate SDK loading: set active groups and call OptanonWrapper
      mockWindow.__setActiveGroups(inputs.fullConsent);
      mockWindow.__setOneTrust({
        IsAlertBoxClosed: jest.fn(() => true),
      });
      mockWindow.OptanonWrapper?.();

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('preserves existing OptanonWrapper function', async () => {
      const mockWindow = createMockWindow({
        initialOptanonWrapper: jest.fn(),
      });
      const originalWrapper = mockWindow.OptanonWrapper as jest.Mock;

      await createCookieProSource(mockWindow, mockElb);

      // Call the wrapped function
      mockWindow.__setActiveGroups(inputs.fullConsent);
      mockWindow.__setOneTrust({
        IsAlertBoxClosed: jest.fn(() => true),
      });
      mockWindow.OptanonWrapper?.();

      // Original should have been called
      expect(originalWrapper).toHaveBeenCalledTimes(1);
      // And our handler should have processed consent
      expect(consentCalls).toHaveLength(1);
    });

    test('self-unwraps after first call (no double-firing with event listener)', async () => {
      const mockWindow = createMockWindow();

      await createCookieProSource(mockWindow, mockElb);

      // Simulate SDK loading: set active groups and call OptanonWrapper
      mockWindow.__setActiveGroups(inputs.fullConsent);
      mockWindow.__setOneTrust({
        IsAlertBoxClosed: jest.fn(() => true),
      });
      mockWindow.OptanonWrapper?.();

      // 1 consent call from OptanonWrapper
      expect(consentCalls).toHaveLength(1);

      // Now fire OneTrustGroupsUpdated for same consent (simulating SDK double-fire)
      mockWindow.__dispatchEvent('OneTrustGroupsUpdated');

      // Only 2 total -- one from OptanonWrapper, one from event listener
      // (NOT 3 which would happen if OptanonWrapper was still wrapped)
      expect(consentCalls).toHaveLength(2);

      // Calling OptanonWrapper again should NOT produce another consent call
      // (it's been restored to undefined/original)
      mockWindow.OptanonWrapper?.();
      expect(consentCalls).toHaveLength(2);
    });

    test('skips consent in OptanonWrapper when explicitOnly and alert box not closed', async () => {
      const mockWindow = createMockWindow();

      await createCookieProSource(mockWindow, mockElb);

      // Simulate SDK loading without explicit consent
      mockWindow.__setActiveGroups(inputs.minimalConsent);
      mockWindow.__setOneTrust({
        IsAlertBoxClosed: jest.fn(() => false),
      });
      mockWindow.OptanonWrapper?.();

      expect(consentCalls).toHaveLength(0);
    });
  });

  describe('OneTrustGroupsUpdated event', () => {
    test('handles consent change via event', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.minimalConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      // Initial consent from already loaded
      expect(consentCalls).toHaveLength(1);

      // User updates consent
      mockWindow.__setActiveGroups(inputs.fullConsent);
      mockWindow.__dispatchEvent('OneTrustGroupsUpdated');

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual(outputs.fullConsentMapped);
    });

    test('handles consent change event when explicitOnly=true and alert box closed', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.minimalConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      // Initial consent
      expect(consentCalls).toHaveLength(1);

      // Consent change event -- alert box is still closed (user already interacted)
      mockWindow.__setActiveGroups(inputs.fullConsent);
      mockWindow.__dispatchEvent('OneTrustGroupsUpdated');

      expect(consentCalls).toHaveLength(2);
    });

    test('handles multiple consent changes', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.minimalConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      // Initial
      expect(consentCalls).toHaveLength(1);

      // First change
      mockWindow.__setActiveGroups(inputs.partialConsent);
      mockWindow.__dispatchEvent('OneTrustGroupsUpdated');
      expect(consentCalls).toHaveLength(2);

      // Second change
      mockWindow.__setActiveGroups(inputs.fullConsent);
      mockWindow.__dispatchEvent('OneTrustGroupsUpdated');
      expect(consentCalls).toHaveLength(3);
      expect(consentCalls[2].consent).toEqual(outputs.fullConsentMapped);
    });
  });

  describe('consent revocation', () => {
    test('handles consent withdrawal (accept all then deny marketing)', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.fullConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      // Initial: full consent
      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);

      // User revokes to partial (necessary + functional only)
      mockWindow.__setActiveGroups(inputs.partialConsent);
      mockWindow.__dispatchEvent('OneTrustGroupsUpdated');

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual(outputs.partialConsentMapped);
    });

    test('handles consent withdrawal to minimal', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.fullConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      // User revokes to minimal (necessary only)
      mockWindow.__setActiveGroups(inputs.minimalConsent);
      mockWindow.__dispatchEvent('OneTrustGroupsUpdated');

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual(outputs.minimalConsentMapped);
    });
  });

  describe('category mapping', () => {
    test('maps full consent correctly', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.fullConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('maps partial consent correctly with explicit false for denied groups', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.partialConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.partialConsentMapped);
      // Verify explicit false values
      expect(consentCalls[0].consent.analytics).toBe(false);
      expect(consentCalls[0].consent.marketing).toBe(false);
    });

    test('maps minimal consent correctly with explicit false for denied groups', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.minimalConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);
      expect(consentCalls[0].consent.analytics).toBe(false);
      expect(consentCalls[0].consent.marketing).toBe(false);
    });

    test('maps analytics only consent correctly', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.analyticsOnlyConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.analyticsOnlyMapped);
    });

    test('maps marketing only consent correctly', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.marketingOnlyConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      expect(consentCalls[0].consent).toEqual(outputs.marketingOnlyMapped);
    });

    test('uses custom category mapping', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.fullConsent,
      });

      await createCookieProSource(mockWindow, mockElb, {
        settings: {
          categoryMap: {
            C0001: 'essential',
            C0002: 'statistics',
            C0003: 'essential',
            C0004: 'ads',
            C0005: 'ads',
          },
        },
      });

      expect(consentCalls[0].consent).toEqual({
        essential: true,
        statistics: true,
        ads: true,
      });
    });

    test('ignores unmapped category IDs', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.customCategoryConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      // C0001 -> functional, CUSTOM01 and CUSTOM02 are not in default map -> ignored
      // analytics and marketing absent -> false
      expect(consentCalls[0].consent).toEqual({
        functional: true,
        analytics: false,
        marketing: false,
      });
    });

    test('handles empty active groups string', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: inputs.emptyConsent,
      });

      await createCookieProSource(mockWindow, mockElb);

      // Empty string -> no active categories -> all groups false
      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({
        functional: false,
        analytics: false,
        marketing: false,
      });
    });

    test('handles case-insensitive category IDs', async () => {
      const mockWindow = createMockWindow({
        sdkLoaded: true,
        alertBoxClosed: true,
        activeGroups: ',c0001,c0002,',
      });

      await createCookieProSource(mockWindow, mockElb);

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({
        functional: true,
        analytics: true,
        marketing: false,
      });
    });
  });

  describe('cleanup', () => {
    test('destroy removes event listener and restores OptanonWrapper', async () => {
      const originalWrapper = jest.fn();
      const mockWindow = createMockWindow({
        initialOptanonWrapper: originalWrapper,
      });

      const source = await createCookieProSource(mockWindow, mockElb);

      // Destroy the source (before OptanonWrapper self-unwraps)
      await source.destroy?.();

      // Verify removeEventListener was called for OneTrustGroupsUpdated
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'OneTrustGroupsUpdated',
        expect.any(Function),
      );

      // Verify OptanonWrapper was restored to original
      expect(mockWindow.OptanonWrapper).toBe(originalWrapper);
    });

    test('destroy sets OptanonWrapper to undefined when no original existed', async () => {
      const mockWindow = createMockWindow();

      const source = await createCookieProSource(mockWindow, mockElb);

      await source.destroy?.();

      expect(mockWindow.OptanonWrapper).toBeUndefined();
    });
  });

  describe('no window environment', () => {
    test('handles missing window gracefully', async () => {
      const source = await sourceCookiePro({
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
        id: 'test-cookiepro',
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

      expect(source.type).toBe('cookiepro');
      expect(consentCalls).toHaveLength(0);
    });
  });
});
