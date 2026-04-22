import { sourceUsercentrics } from '../index';
import { createMockLogger } from '@walkeros/core';
import * as inputs from '../examples/inputs';
import * as outputs from '../examples/outputs';
import { examples } from '../dev';
import type {
  CategoryData,
  ConsentData,
  ConsentDetails,
  Usercentrics,
} from 'usercentrics-browser-ui';
import type { UsercentricsV2Service } from '../types';
import {
  createMockElb,
  createMockWindow,
  createUsercentricsSource,
  ConsentCall,
  MockWindow,
} from './test-utils';

describe('Usercentrics Source', () => {
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
        createUsercentricsSource(mockWindow, mockElb),
      ).resolves.not.toThrow();
    });

    test('returns correct source type', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb);

      expect(source.type).toBe('usercentrics');
    });

    test('uses default settings when none provided', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb);

      expect(source.config.settings?.eventName).toBe('ucEvent');
      expect(source.config.settings?.explicitOnly).toBe(true);
      expect(source.config.settings?.categoryMap).toEqual({});
    });

    test('merges custom settings with defaults', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          eventName: 'myConsentEvent',
          explicitOnly: false,
          categoryMap: { essential: 'functional' },
        },
      });

      expect(source.config.settings?.eventName).toBe('myConsentEvent');
      expect(source.config.settings?.explicitOnly).toBe(false);
      expect(source.config.settings?.categoryMap).toEqual({
        essential: 'functional',
      });
    });

    test('registers event listener on configured event name', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'ucEvent',
        expect.any(Function),
      );
    });

    test('registers listener on custom event name', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { eventName: 'UC_SDK_EVENT' },
      });

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'UC_SDK_EVENT',
        expect.any(Function),
      );
    });
  });

  describe('explicit consent filtering', () => {
    test('processes explicit consent events', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);

      expect(consentCalls).toHaveLength(1);
    });

    test('processes explicit consent with uppercase type', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsentUpperCase);

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);
    });

    test('ignores implicit consent when explicitOnly=true', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.implicitConsent);

      expect(consentCalls).toHaveLength(0);
    });

    test('processes implicit consent when explicitOnly=false', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { explicitOnly: false },
      });

      mockWindow.__dispatchEvent('ucEvent', inputs.implicitConsent);

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);
    });
  });

  describe('non-consent event filtering', () => {
    test('ignores non-consent_status events', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.nonConsentEvent);

      expect(consentCalls).toHaveLength(0);
    });

    test('ignores events without detail', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      // Dispatch event with no detail
      mockWindow.__dispatchEvent('ucEvent');

      expect(consentCalls).toHaveLength(0);
    });
  });

  describe('group-level consent (ucCategory)', () => {
    test('maps partial consent correctly', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.partialConsent);

      expect(consentCalls[0].consent).toEqual(outputs.partialConsentMapped);
    });

    test('applies custom category mapping', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          categoryMap: {
            essential: 'functional',
            functional: 'functional',
            marketing: 'marketing',
          },
        },
      });

      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);

      expect(consentCalls[0].consent).toEqual(outputs.fullConsentCustomMapped);
    });

    test('passes through unmapped categories', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: {
          essential: true,
          custom_group: true,
        },
      });

      expect(consentCalls[0].consent).toEqual({
        essential: true,
        custom_group: true,
      });
    });

    test('uses OR logic when multiple categories map to same group', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          categoryMap: {
            essential: 'functional',
            functional: 'functional',
          },
        },
      });

      // essential=true, functional=false both map to 'functional'
      // OR logic: true OR false = true
      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: {
          essential: true,
          functional: false,
          marketing: false,
        },
      });

      expect(consentCalls[0].consent).toEqual({
        functional: true,
        marketing: false,
      });
    });
  });

  describe('service-level consent', () => {
    test('extracts individual services when ucCategory has non-boolean values', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.serviceLevelConsent);

      expect(consentCalls[0].consent).toEqual(outputs.serviceLevelMapped);
    });

    test('normalizes service names to lowercase with underscores', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: { essential: 'partial' },
        'My Custom Service': true,
      });

      expect(consentCalls[0].consent).toHaveProperty('my_custom_service', true);
    });

    test('merges boolean ucCategory entries with service keys', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      // ucCategory has mix of boolean and non-boolean
      // Boolean entries from ucCategory should be included
      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: {
          essential: true, // boolean - include
          marketing: 'partial', // non-boolean - skip (use services)
        },
        'Facebook Pixel': true,
      });

      expect(consentCalls[0].consent).toEqual({
        essential: true,
        facebook_pixel: true,
      });
    });

    test('applies categoryMap to boolean ucCategory entries in service-level mode', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          categoryMap: { essential: 'functional' },
        },
      });

      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: {
          essential: true, // boolean - mapped to 'functional'
          marketing: 'partial', // non-boolean - skipped
        },
        'Facebook Pixel': true,
      });

      expect(consentCalls[0].consent).toEqual({
        functional: true,
        facebook_pixel: true,
      });
    });
  });

  describe('event handling', () => {
    test('handles consent change events', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      // First consent
      mockWindow.__dispatchEvent('ucEvent', inputs.minimalConsent);
      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual(outputs.minimalConsentMapped);

      // User updates consent
      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);
      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual(outputs.fullConsentMapped);
    });

    test('handles consent withdrawal (revocation)', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      // User initially accepts all
      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);
      expect(consentCalls[0].consent).toEqual(outputs.fullConsentMapped);

      // User revokes marketing
      mockWindow.__dispatchEvent('ucEvent', inputs.partialConsent);
      expect(consentCalls[1].consent).toEqual(outputs.partialConsentMapped);
    });

    test('handles multiple consent changes', async () => {
      const mockWindow = createMockWindow();
      await createUsercentricsSource(mockWindow, mockElb);

      mockWindow.__dispatchEvent('ucEvent', inputs.minimalConsent);
      mockWindow.__dispatchEvent('ucEvent', inputs.partialConsent);
      mockWindow.__dispatchEvent('ucEvent', inputs.fullConsent);

      expect(consentCalls).toHaveLength(3);
      expect(consentCalls[2].consent).toEqual(outputs.fullConsentMapped);
    });
  });

  describe('cleanup', () => {
    test('destroy removes event listener', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb);

      await source.destroy?.({
        id: 'test',
        config: source.config,
        env: {} as any,
        logger: createMockLogger(),
      });

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'ucEvent',
        expect.any(Function),
      );
    });

    test('destroy removes listener for custom event name', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb, {
        settings: { eventName: 'myConsentEvent' },
      });

      await source.destroy?.({
        id: 'test',
        config: source.config,
        env: {} as any,
        logger: createMockLogger(),
      });

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'myConsentEvent',
        expect.any(Function),
      );
    });
  });

  describe('apiVersion detection', () => {
    /**
     * Minimal ConsentData stub for V3 fixtures.
     */
    function buildConsentData(
      overrides: Partial<ConsentData> = {},
    ): ConsentData {
      return {
        status: 'ALL_ACCEPTED',
        required: false,
        version: 1,
        controllerId: 'test-controller',
        language: 'en',
        createdAt: 0,
        updatedAt: 0,
        updatedBy: 'onInitialPageLoad',
        setting: { id: 'test-setting', type: 'GDPR', version: '1.0.0' },
        type: 'EXPLICIT',
        hash: 'test-hash',
        ...overrides,
      };
    }

    /**
     * Minimal CategoryData stub for V3 fixtures.
     */
    function buildCategory(
      state: CategoryData['state'],
      name: string,
    ): CategoryData {
      return { state, dps: null, name };
    }

    /**
     * V3 API mock surface used by the adapter.
     */
    interface MockUcCmp {
      isInitialized: jest.Mock<Promise<boolean>, []>;
      getConsentDetails: jest.Mock<Promise<ConsentDetails>, []>;
    }

    function withUcCmp(mockWindow: MockWindow, ucCmp: MockUcCmp): void {
      (mockWindow as unknown as { __ucCmp: Usercentrics }).__ucCmp =
        ucCmp as unknown as Usercentrics;
    }

    function withUcUi(
      mockWindow: MockWindow,
      ucUi: {
        isInitialized?: () => boolean;
        getServicesBaseInfo?: () => UsercentricsV2Service[];
      },
    ): void {
      (mockWindow as unknown as { UC_UI: typeof ucUi }).UC_UI = ucUi;
    }

    /**
     * Dispatch a V3 event (detail shape differs from V2).
     */
    function dispatchV3Event(
      mockWindow: MockWindow,
      eventName: string,
      detail: { source: string; type: string },
    ): void {
      (
        mockWindow as unknown as {
          __dispatchEvent: (
            event: string,
            detail: { source: string; type: string },
          ) => void;
        }
      ).__dispatchEvent(eventName, detail);
    }

    /**
     * Drain the microtask queue so awaited V3 calls settle. Fake timers are
     * on globally, so a setTimeout flush would hang.
     */
    async function flushPromises(): Promise<void> {
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
    }

    test('auto + both V2 and V3 present: V3 fires, V2 does not', async () => {
      const mockWindow = createMockWindow();

      const v3Details: ConsentDetails = {
        consent: buildConsentData({
          status: 'SOME_ACCEPTED',
          type: 'EXPLICIT',
        }),
        services: {},
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
          marketing: buildCategory('ALL_DENIED', 'Marketing'),
        },
      };
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue(v3Details),
      });

      // V2 also present, but should be ignored because __ucCmp wins in auto mode.
      const v2Services: UsercentricsV2Service[] = [
        { categorySlug: 'essential', consent: { status: true } },
        { categorySlug: 'marketing', consent: { status: true } }, // would differ from V3
      ];
      withUcUi(mockWindow, {
        isInitialized: () => true,
        getServicesBaseInfo: () => v2Services,
      });

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'auto' },
      });
      await flushPromises();

      // V3 fired once with V3-shaped consent (marketing=false).
      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({
        essential: true,
        marketing: false,
      });
    });

    test('auto + only V2 present: V2 fires', async () => {
      const mockWindow = createMockWindow();
      const v2Services: UsercentricsV2Service[] = [
        { categorySlug: 'essential', consent: { status: true } },
        { categorySlug: 'marketing', consent: { status: false } },
      ];
      withUcUi(mockWindow, {
        isInitialized: () => true,
        getServicesBaseInfo: () => v2Services,
      });

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'auto' },
      });
      await flushPromises();

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({
        essential: true,
        marketing: false,
      });
    });

    test('auto + neither present: both listeners registered', async () => {
      const mockWindow = createMockWindow();

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'auto' },
      });
      await flushPromises();

      // Nothing fired yet — no static state on either API.
      expect(consentCalls).toHaveLength(0);

      // V2 event fires.
      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: { essential: true, marketing: false },
      });
      expect(consentCalls).toHaveLength(1);

      // Now V3 API becomes available and dispatches its event.
      const v3Details: ConsentDetails = {
        consent: buildConsentData({ status: 'ALL_ACCEPTED', type: 'EXPLICIT' }),
        services: {},
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
        },
      };
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue(v3Details),
      });
      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'CMP',
        type: 'ACCEPT_ALL',
      });
      await flushPromises();

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual({ essential: true });
    });

    test('apiVersion=v2 + only V3 present: V3 is ignored, V2 listener still works', async () => {
      const mockWindow = createMockWindow();
      const getConsentDetails = jest.fn();
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails,
      });

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });
      await flushPromises();

      // V3 must have been skipped entirely.
      expect(getConsentDetails).not.toHaveBeenCalled();
      expect(consentCalls).toHaveLength(0);

      // V2 listener is active — dispatching ucEvent reaches it.
      mockWindow.__dispatchEvent('ucEvent', {
        event: 'consent_status',
        type: 'explicit',
        ucCategory: { essential: true, marketing: false },
      });
      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({
        essential: true,
        marketing: false,
      });
    });

    test('apiVersion=v3 + only V2 present: V2 is ignored, V3 listener still works', async () => {
      const mockWindow = createMockWindow();
      const getServicesBaseInfo = jest.fn((): UsercentricsV2Service[] => [
        { categorySlug: 'essential', consent: { status: true } },
      ]);
      withUcUi(mockWindow, {
        isInitialized: () => true,
        getServicesBaseInfo,
      });

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v3' },
      });
      await flushPromises();

      // V2 must have been skipped entirely.
      expect(getServicesBaseInfo).not.toHaveBeenCalled();
      expect(consentCalls).toHaveLength(0);

      // Attach V3 API, then dispatch the V3 event — V3 listener is active.
      const v3Details: ConsentDetails = {
        consent: buildConsentData({ status: 'ALL_ACCEPTED', type: 'EXPLICIT' }),
        services: {},
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
        },
      };
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue(v3Details),
      });
      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'CMP',
        type: 'ACCEPT_ALL',
      });
      await flushPromises();

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({ essential: true });
    });
  });

  describe('no window environment', () => {
    test('handles missing window gracefully', async () => {
      const source = await sourceUsercentrics({
        collector: {} as never,
        config: {},
        env: {
          push: mockElb,
          command: mockElb,
          elb: mockElb,
          window: undefined,
          logger: {
            error: () => {},
            warn: () => {},
            info: () => {},
            debug: () => {},
            json: () => {},
            throw: (m: string | Error) => {
              throw typeof m === 'string' ? new Error(m) : m;
            },
            scope: function () {
              return this;
            },
          },
        },
        id: 'test-usercentrics',
        logger: {
          error: () => {},
          warn: () => {},
          info: () => {},
          debug: () => {},
          json: () => {},
          throw: (m: string | Error) => {
            throw typeof m === 'string' ? new Error(m) : m;
          },
          scope: function () {
            return this;
          },
        },
        setIngest: async () => {},
        setRespond: jest.fn(),
      });

      expect(source.type).toBe('usercentrics');
      expect(consentCalls).toHaveLength(0);
    });
  });
});
