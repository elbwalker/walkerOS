import { sourceUsercentrics } from '../index';
import { createMockLogger } from '@walkeros/core';
import type {
  UsercentricsV2Api,
  UsercentricsV2Service,
  UsercentricsV3Api,
  UsercentricsV3CategoryData,
  UsercentricsV3CategoryState,
  UsercentricsV3ConsentData,
  UsercentricsV3ConsentDetails,
} from '../types';
import {
  createMockElb,
  createMockWindow,
  createUsercentricsSource,
  makeUcUi,
  makeV2Service,
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

      expect(source.config.settings?.explicitOnly).toBe(true);
      expect(source.config.settings?.apiVersion).toBe('auto');
      expect(source.config.settings?.v3EventName).toBe('UC_UI_CMP_EVENT');
      expect(source.config.settings?.categoryMap).toEqual({});
    });

    test('merges custom settings with defaults', async () => {
      const mockWindow = createMockWindow();
      const source = await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          explicitOnly: false,
          categoryMap: { essential: 'functional' },
        },
      });

      expect(source.config.settings?.explicitOnly).toBe(false);
      expect(source.config.settings?.categoryMap).toEqual({
        essential: 'functional',
      });
      // Untouched defaults remain.
      expect(source.config.settings?.apiVersion).toBe('auto');
      expect(source.config.settings?.v3EventName).toBe('UC_UI_CMP_EVENT');
    });

    test('registers official V2 listeners when only UC_UI is present', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([makeV2Service('essential', true, 'explicit')]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'UC_UI_INITIALIZED',
        expect.any(Function),
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'UC_UI_CMP_EVENT',
        expect.any(Function),
      );
    });
  });

  describe('explicit consent filtering', () => {
    test('publishes a returning visitor whose history is explicit (default explicitOnly)', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('marketing', true, 'explicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({
        essential: true,
        marketing: true,
      });
    });

    test('suppresses a first-visit implicit-only snapshot under default explicitOnly', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'implicit'),
          makeV2Service('marketing', false, 'implicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });

      expect(consentCalls).toHaveLength(0);
    });

    test('publishes an implicit-only snapshot when explicitOnly=false', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'implicit'),
          makeV2Service('marketing', false, 'implicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2', explicitOnly: false },
      });

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({
        essential: true,
        marketing: false,
      });
    });
  });

  describe('group-level consent (ucCategory)', () => {
    test('maps partial consent via strict-AND aggregation', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('functional', true, 'explicit'),
          makeV2Service('marketing', false, 'explicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });

      expect(consentCalls[0].consent).toEqual({
        essential: true,
        functional: true,
        marketing: false,
      });
    });

    test('applies custom category mapping', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('functional', true, 'explicit'),
          makeV2Service('marketing', true, 'explicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          apiVersion: 'v2',
          categoryMap: {
            essential: 'functional',
            functional: 'functional',
            marketing: 'marketing',
          },
        },
      });

      expect(consentCalls[0].consent).toEqual({
        functional: true,
        marketing: true,
      });
    });

    test('passes through unmapped categories', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('custom_group', true, 'explicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });

      expect(consentCalls[0].consent).toEqual({
        essential: true,
        custom_group: true,
      });
    });

    test('uses strict AND when multiple categories map to the same group', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('functional', false, 'explicit'),
          makeV2Service('marketing', false, 'explicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          apiVersion: 'v2',
          categoryMap: {
            essential: 'functional',
            functional: 'functional',
          },
        },
      });

      // essential=true, functional=false both map to 'functional'.
      // Strict AND: any deny denies → functional = false.
      expect(consentCalls[0].consent).toEqual({
        functional: false,
        marketing: false,
      });
    });

    test('strict AND: all contributing sources true → target true', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('functional', true, 'explicit'),
          makeV2Service('marketing', false, 'explicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          apiVersion: 'v2',
          categoryMap: {
            essential: 'functional',
            functional: 'functional',
          },
        },
      });

      expect(consentCalls[0].consent).toEqual({
        functional: true,
        marketing: false,
      });
    });
  });

  describe('category-level aggregation across services', () => {
    // Through the real V2 adapter, buildDetailFromServices always produces a
    // boolean ucCategory, so parseConsent takes the group-level branch and the
    // per-service name keys are not consumed. These tests exercise that
    // end-to-end V2 path (multiple services per category, strict-AND).

    test('aggregates multiple services within a category (strict AND)', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('marketing', true, 'explicit', 'Google Analytics'),
          makeV2Service('marketing', false, 'explicit', 'Meta Pixel'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });

      // One denied service in 'marketing' denies the whole category.
      expect(consentCalls[0].consent).toEqual({ marketing: false });
    });

    test('a single accepted service yields its category as true', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit', 'My Custom Service'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });

      expect(consentCalls[0].consent).toEqual({ essential: true });
    });

    test('applies categoryMap to aggregated categories', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('marketing', true, 'explicit', 'Facebook Pixel'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: {
          apiVersion: 'v2',
          categoryMap: { essential: 'functional' },
        },
      });

      expect(consentCalls[0].consent).toEqual({
        functional: true,
        marketing: true,
      });
    });
  });

  describe('event handling', () => {
    test('re-reads and publishes on a UC_UI_CMP_EVENT decision', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('marketing', false, 'explicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });

      // Static read at init published once.
      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({
        essential: true,
        marketing: false,
      });

      // User accepts marketing; the getter now returns the updated services.
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('marketing', true, 'explicit'),
        ]),
      );
      mockWindow.__dispatchCmpEvent({ source: 'button', type: 'ACCEPT_ALL' });

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual({
        essential: true,
        marketing: true,
      });
    });

    test('handles consent withdrawal (revocation)', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('marketing', true, 'explicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });

      expect(consentCalls[0].consent).toEqual({
        essential: true,
        marketing: true,
      });

      // User revokes marketing.
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('marketing', false, 'explicit'),
        ]),
      );
      mockWindow.__dispatchCmpEvent({ source: 'button', type: 'SAVE' });

      expect(consentCalls[1].consent).toEqual({
        essential: true,
        marketing: false,
      });
    });

    test('ignores non-decision CMP events', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([makeV2Service('marketing', true, 'explicit')]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });
      const before = consentCalls.length;

      mockWindow.__dispatchCmpEvent({ source: 'first', type: 'CMP_SHOWN' });

      expect(consentCalls).toHaveLength(before);
    });
  });

  describe('cleanup', () => {
    test('destroy removes both official V2 listeners', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([makeV2Service('marketing', true, 'explicit')]),
      );
      const source = await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v2' },
      });

      await source.destroy?.({
        id: 'test',
        config: source.config,
        env: {} as never,
        logger: createMockLogger(),
      });

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'UC_UI_INITIALIZED',
        expect.any(Function),
      );
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        'UC_UI_CMP_EVENT',
        expect.any(Function),
      );
    });
  });

  describe('apiVersion detection', () => {
    /**
     * Minimal ConsentData stub for V3 fixtures.
     */
    function buildConsentData(
      overrides: Partial<UsercentricsV3ConsentData> = {},
    ): UsercentricsV3ConsentData {
      return {
        type: 'EXPLICIT',
        ...overrides,
      };
    }

    /**
     * Minimal CategoryData stub for V3 fixtures.
     */
    function buildCategory(
      state: UsercentricsV3CategoryState,
      name: string,
    ): UsercentricsV3CategoryData {
      return { state, name };
    }

    /**
     * V3 API mock surface used by the adapter.
     */
    interface MockUcCmp extends UsercentricsV3Api {
      isInitialized: jest.Mock<Promise<boolean>, []>;
      getConsentDetails: jest.Mock<Promise<UsercentricsV3ConsentDetails>, []>;
    }

    function withUcCmp(mockWindow: MockWindow, ucCmp: MockUcCmp): void {
      (mockWindow as unknown as { __ucCmp: UsercentricsV3Api }).__ucCmp = ucCmp;
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

      const v3Details: UsercentricsV3ConsentDetails = {
        consent: buildConsentData({ type: 'EXPLICIT' }),
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
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('marketing', true, 'explicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'auto' },
      });
      await flushPromises();

      // V3 fired once with V3-shaped consent (marketing=false, strict AND).
      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({
        essential: true,
        marketing: false,
      });
    });

    test('auto + only V2 present (explicit history): static read publishes the returning visitor', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('marketing', false, 'explicit'),
        ]),
      );

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

    test('auto + only V2 present (implicit-only history): first visit does NOT publish', async () => {
      const mockWindow = createMockWindow();
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'implicit'),
          makeV2Service('marketing', false, 'implicit'),
        ]),
      );

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'auto' },
      });
      await flushPromises();

      expect(consentCalls).toHaveLength(0);
    });

    test('auto + neither present: both listeners registered', async () => {
      const mockWindow = createMockWindow();

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'auto' },
      });
      await flushPromises();

      // Nothing fired yet — no static state on either API.
      expect(consentCalls).toHaveLength(0);

      // Both adapter event buses are wired.
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'UC_UI_INITIALIZED',
        expect.any(Function),
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'UC_UI_CMP_EVENT',
        expect.any(Function),
      );

      // V2 API now becomes available with an explicit decision; the
      // UC_UI_INITIALIZED lifecycle event drives the V2 static read.
      mockWindow.__setUcUi(
        makeUcUi([makeV2Service('essential', true, 'explicit')]),
      );
      mockWindow.__dispatchInitialized();

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({ essential: true });
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

      // V2 API becomes available; a decision event drives the V2 read.
      mockWindow.__setUcUi(
        makeUcUi([
          makeV2Service('essential', true, 'explicit'),
          makeV2Service('marketing', false, 'explicit'),
        ]),
      );
      mockWindow.__dispatchCmpEvent({ source: 'button', type: 'ACCEPT_ALL' });

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({
        essential: true,
        marketing: false,
      });
    });

    test('apiVersion=v3 + only V2 present: V2 is ignored, V3 listener still works', async () => {
      const mockWindow = createMockWindow();
      const getServicesBaseInfo = jest.fn((): UsercentricsV2Service[] => [
        makeV2Service('essential', true, 'explicit'),
      ]);
      const ucUi: UsercentricsV2Api = {
        isInitialized: () => true,
        getServicesBaseInfo,
      };
      mockWindow.__setUcUi(ucUi);

      await createUsercentricsSource(mockWindow, mockElb, {
        settings: { apiVersion: 'v3' },
      });
      await flushPromises();

      // V2 must have been skipped entirely.
      expect(getServicesBaseInfo).not.toHaveBeenCalled();
      expect(consentCalls).toHaveLength(0);

      // Attach V3 API, then dispatch the V3 event — V3 listener is active.
      const v3Details: UsercentricsV3ConsentDetails = {
        consent: buildConsentData({ type: 'EXPLICIT' }),
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
        },
      };
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue(v3Details),
      });
      mockWindow.__dispatchCmpEvent({ source: 'button', type: 'ACCEPT_ALL' });
      await flushPromises();

      expect(consentCalls).toHaveLength(1);
      expect(consentCalls[0].consent).toEqual({ essential: true });
    });
  });

  describe('factory side-effect-free (init hygiene)', () => {
    test('factory attaches no listener and emits no consent until init() runs', async () => {
      const mockWindow = createMockWindow();
      // V2 already initialized with an explicit decision: a static read WOULD
      // emit if the factory did it.
      mockWindow.__setUcUi(
        makeUcUi([makeV2Service('essential', true, 'explicit')]),
      );

      const source = await sourceUsercentrics({
        collector: {} as never,
        config: { settings: { apiVersion: 'v2' } },
        env: {
          push: mockElb,
          command: mockElb,
          elb: mockElb,
          window: mockWindow as unknown as Window & typeof globalThis,
          logger: createMockLogger(),
        },
        id: 'test-usercentrics',
        logger: createMockLogger(),
        withScope: async (_r, _resp, body) => body({} as never),
      });

      // Pass-1 factory must be side-effect-free: no listener, no consent emit.
      expect(mockWindow.addEventListener).not.toHaveBeenCalled();
      expect(consentCalls).toHaveLength(0);

      // init() (Pass 2) performs the adapter setup: listeners + static read emit.
      await source.init?.();

      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'UC_UI_INITIALIZED',
        expect.any(Function),
      );
      expect(consentCalls).toHaveLength(1);
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
          logger: createMockLogger(),
        },
        id: 'test-usercentrics',
        logger: createMockLogger(),
        withScope: async (_r, _resp, body) => body({} as never),
      });

      expect(source.type).toBe('usercentrics');
      expect(consentCalls).toHaveLength(0);
    });
  });
});
