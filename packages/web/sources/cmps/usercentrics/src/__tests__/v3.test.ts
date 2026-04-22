import { createMockLogger } from '@walkeros/core';
import { setupV3Adapter } from '../lib/v3';
import type {
  Settings,
  UsercentricsV3Api,
  UsercentricsV3CategoryData,
  UsercentricsV3CategoryState,
  UsercentricsV3CmpEventDetail,
  UsercentricsV3ConsentData,
  UsercentricsV3ConsentDetails,
} from '../types';
import {
  ConsentCall,
  createMockElb,
  createMockWindow,
  MockWindow,
} from './test-utils';

/**
 * Build a Settings object with defaults matching the source's own defaults.
 * Tests override per-case as needed.
 */
function buildSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    eventName: 'ucEvent',
    explicitOnly: true,
    categoryMap: {},
    apiVersion: 'auto',
    v3EventName: 'UC_UI_CMP_EVENT',
    ...overrides,
  };
}

/**
 * Minimal ConsentData stub. Only `type` is read by the adapter.
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
 * Minimal CategoryData stub.
 */
function buildCategory(
  state: UsercentricsV3CategoryState,
  name: string,
): UsercentricsV3CategoryData {
  return {
    state,
    name,
  };
}

/**
 * Shape of the V3 window API subset the adapter needs. We use jest mocks so
 * each test can swap return values and assert call counts.
 */
interface MockUcCmp extends UsercentricsV3Api {
  isInitialized: jest.Mock<Promise<boolean>, []>;
  getConsentDetails: jest.Mock<Promise<UsercentricsV3ConsentDetails>, []>;
}

/**
 * Attach a __ucCmp mock onto the MockWindow. Because `Window.__ucCmp` is now
 * optional and typed to the local minimal `UsercentricsV3Api`, the mock
 * directly implements that interface — no `as unknown as Usercentrics` cast.
 */
function withUcCmp(mockWindow: MockWindow, ucCmp: MockUcCmp): void {
  (mockWindow as unknown as { __ucCmp: UsercentricsV3Api }).__ucCmp = ucCmp;
}

/**
 * Dispatch a V3 event. The V3 event.detail is { source, type } — not the
 * same shape as the V2 UsercentricsEventDetail. We go through the mock
 * listener registry via a cast.
 */
function dispatchV3Event(
  mockWindow: MockWindow,
  eventName: string,
  detail: UsercentricsV3CmpEventDetail,
): void {
  (
    mockWindow as unknown as {
      __dispatchEvent: (
        event: string,
        detail: UsercentricsV3CmpEventDetail,
      ) => void;
    }
  ).__dispatchEvent(eventName, detail);
}

/**
 * Let the microtask queue drain so the adapter's awaited
 * getConsentDetails() completes before we assert.
 */
async function flushPromises(): Promise<void> {
  // Fake timers are enabled globally (see web.setup.mjs), so a setTimeout-
  // based flush would never fire. Drain the microtask queue multiple times
  // to cover the adapter's chained awaits (getConsentDetails → parse → elb).
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe('V3 adapter (setupV3Adapter)', () => {
  let consentCalls: ConsentCall[];
  let mockElb: ReturnType<typeof createMockElb>;

  beforeEach(() => {
    consentCalls = [];
    mockElb = createMockElb(consentCalls);
  });

  describe('post-init static read', () => {
    test('fetches consent via getConsentDetails and maps categories to walkerOS state', async () => {
      const mockWindow = createMockWindow();
      const details: UsercentricsV3ConsentDetails = {
        consent: buildConsentData({ type: 'EXPLICIT' }),
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
          marketing: buildCategory('ALL_DENIED', 'Marketing'),
          functional: buildCategory('SOME_ACCEPTED', 'Functional'),
        },
      };
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue(details),
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      // Strict AND semantics: only ALL_ACCEPTED → true. SOME_ACCEPTED is partial
      // and must NOT be treated as consent granted.
      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        essential: true,
        marketing: false,
        functional: false,
      });
      expect(mockElb).toHaveBeenCalledTimes(1);

      cleanup();
    });

    test('SOME_ACCEPTED maps to false (strict AND semantics)', async () => {
      const mockWindow = createMockWindow();
      const details: UsercentricsV3ConsentDetails = {
        consent: buildConsentData({ type: 'EXPLICIT' }),
        categories: {
          marketing: buildCategory('SOME_ACCEPTED', 'Marketing'),
          functional: buildCategory('ALL_ACCEPTED', 'Functional'),
        },
      };
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue(details),
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        marketing: false,
        functional: true,
      });
      cleanup();
    });

    test('unknown future state (e.g. NO_STATE) maps to false', async () => {
      const mockWindow = createMockWindow();
      const details: UsercentricsV3ConsentDetails = {
        consent: buildConsentData({ type: 'EXPLICIT' }),
        categories: {
          essential: buildCategory('NO_STATE', 'Essential'),
        },
      };
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue(details),
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        essential: false,
      });
      cleanup();
    });

    test('skips static read when __ucCmp.isInitialized() resolves false', async () => {
      const mockWindow = createMockWindow();
      const getConsentDetails = jest.fn();
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(false),
        getConsentDetails,
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      expect(mockElb).not.toHaveBeenCalled();
      expect(getConsentDetails).not.toHaveBeenCalled();

      cleanup();
    });

    test('skips static read when __ucCmp is absent', async () => {
      const mockWindow = createMockWindow();
      // No __ucCmp attached.

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      expect(mockElb).not.toHaveBeenCalled();

      cleanup();
    });
  });

  describe('static-read error handling (Task D)', () => {
    test('isInitialized() throwing does not reject setupV3Adapter', async () => {
      const mockWindow = createMockWindow();
      const boom = new Error('transient CMP failure');
      const getConsentDetails = jest.fn();
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockRejectedValue(boom),
        getConsentDetails,
      });

      // Must resolve, not reject. Listener stays registered.
      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      // No consent published (static read failed).
      expect(mockElb).not.toHaveBeenCalled();

      // But the listener is live — a subsequent real event still works.
      getConsentDetails.mockResolvedValue({
        consent: buildConsentData({ type: 'EXPLICIT' }),
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
        },
      } satisfies UsercentricsV3ConsentDetails);
      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'CMP',
        type: 'ACCEPT_ALL',
      });
      await flushPromises();
      expect(mockElb).toHaveBeenCalledTimes(1);

      cleanup();
    });

    test('getConsentDetails() throwing during static read does not reject setupV3Adapter', async () => {
      const mockWindow = createMockWindow();
      const boom = new Error('consent fetch failed');
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockRejectedValue(boom),
      });

      await expect(
        setupV3Adapter({
          window: mockWindow as unknown as Window & typeof globalThis,
          elb: mockElb,
          settings: buildSettings(),
          logger: createMockLogger(),
        }),
      ).resolves.toBeDefined();

      expect(mockElb).not.toHaveBeenCalled();
    });
  });

  describe('event-listener decision filter (Task C)', () => {
    test('ACCEPT_ALL + source=CMP triggers publish', async () => {
      const mockWindow = createMockWindow();
      const getConsentDetails = jest.fn().mockResolvedValue({
        consent: buildConsentData({ type: 'EXPLICIT' }),
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
        },
      } satisfies UsercentricsV3ConsentDetails);
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(false),
        getConsentDetails,
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'CMP',
        type: 'ACCEPT_ALL',
      });
      await flushPromises();

      expect(getConsentDetails).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledTimes(1);

      cleanup();
    });

    test('SAVE + source=CMP triggers publish', async () => {
      const mockWindow = createMockWindow();
      const getConsentDetails = jest.fn().mockResolvedValue({
        consent: buildConsentData({ type: 'EXPLICIT' }),
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
        },
      } satisfies UsercentricsV3ConsentDetails);
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(false),
        getConsentDetails,
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'CMP',
        type: 'SAVE',
      });
      await flushPromises();

      expect(getConsentDetails).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledTimes(1);

      cleanup();
    });

    test('DENY_ALL + source=CMP triggers publish', async () => {
      const mockWindow = createMockWindow();
      const getConsentDetails = jest.fn().mockResolvedValue({
        consent: buildConsentData({ type: 'EXPLICIT' }),
        categories: {
          marketing: buildCategory('ALL_DENIED', 'Marketing'),
        },
      } satisfies UsercentricsV3ConsentDetails);
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(false),
        getConsentDetails,
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'CMP',
        type: 'DENY_ALL',
      });
      await flushPromises();

      expect(getConsentDetails).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        marketing: false,
      });

      cleanup();
    });

    test('CMP_SHOWN + source=CMP does NOT trigger publish', async () => {
      const mockWindow = createMockWindow();
      const getConsentDetails = jest.fn();
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(false),
        getConsentDetails,
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'CMP',
        type: 'CMP_SHOWN',
      });
      await flushPromises();

      expect(getConsentDetails).not.toHaveBeenCalled();
      expect(mockElb).not.toHaveBeenCalled();

      cleanup();
    });

    test('event with source !== CMP does NOT trigger publish', async () => {
      const mockWindow = createMockWindow();
      const getConsentDetails = jest.fn();
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(false),
        getConsentDetails,
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'SOMETHING_ELSE',
        type: 'ACCEPT_ALL',
      });
      await flushPromises();

      expect(getConsentDetails).not.toHaveBeenCalled();
      expect(mockElb).not.toHaveBeenCalled();

      cleanup();
    });
  });

  describe('explicitOnly filtering via ConsentData.type', () => {
    test('IMPLICIT consent + explicitOnly=true → no elb call', async () => {
      const mockWindow = createMockWindow();
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue({
          consent: buildConsentData({ type: 'IMPLICIT' }),
          categories: {
            essential: buildCategory('ALL_ACCEPTED', 'Essential'),
          },
        } satisfies UsercentricsV3ConsentDetails),
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings({ explicitOnly: true }),
        logger: createMockLogger(),
      });

      expect(mockElb).not.toHaveBeenCalled();

      cleanup();
    });

    test('IMPLICIT consent + explicitOnly=false → elb called', async () => {
      const mockWindow = createMockWindow();
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue({
          consent: buildConsentData({ type: 'IMPLICIT' }),
          categories: {
            essential: buildCategory('ALL_ACCEPTED', 'Essential'),
          },
        } satisfies UsercentricsV3ConsentDetails),
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings({ explicitOnly: false }),
        logger: createMockLogger(),
      });

      expect(mockElb).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        essential: true,
      });

      cleanup();
    });

    test('EXPLICIT consent + explicitOnly=true → elb called', async () => {
      const mockWindow = createMockWindow();
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue({
          consent: buildConsentData({ type: 'EXPLICIT' }),
          categories: {
            essential: buildCategory('ALL_ACCEPTED', 'Essential'),
          },
        } satisfies UsercentricsV3ConsentDetails),
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings({ explicitOnly: true }),
        logger: createMockLogger(),
      });

      expect(mockElb).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        essential: true,
      });

      cleanup();
    });
  });

  describe('cleanup', () => {
    test('cleanup removes the V3 event listener', async () => {
      const mockWindow = createMockWindow();
      const getConsentDetails = jest.fn().mockResolvedValue({
        consent: buildConsentData({ type: 'EXPLICIT' }),
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
        },
      } satisfies UsercentricsV3ConsentDetails);
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(false),
        getConsentDetails,
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      cleanup();

      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'CMP',
        type: 'ACCEPT_ALL',
      });
      await flushPromises();

      expect(getConsentDetails).not.toHaveBeenCalled();
      expect(mockElb).not.toHaveBeenCalled();
    });
  });

  describe('custom v3EventName setting', () => {
    test('registers the listener on the custom event name, not UC_UI_CMP_EVENT', async () => {
      const mockWindow = createMockWindow();
      const getConsentDetails = jest.fn().mockResolvedValue({
        consent: buildConsentData({ type: 'EXPLICIT' }),
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
        },
      } satisfies UsercentricsV3ConsentDetails);
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(false),
        getConsentDetails,
      });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings({ v3EventName: 'MY_CUSTOM_UC_EVENT' }),
        logger: createMockLogger(),
      });

      // Default event name should NOT trigger anything.
      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'CMP',
        type: 'ACCEPT_ALL',
      });
      await flushPromises();
      expect(getConsentDetails).not.toHaveBeenCalled();
      expect(mockElb).not.toHaveBeenCalled();

      // Custom event name SHOULD trigger.
      dispatchV3Event(mockWindow, 'MY_CUSTOM_UC_EVENT', {
        source: 'CMP',
        type: 'ACCEPT_ALL',
      });
      await flushPromises();
      expect(getConsentDetails).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        essential: true,
      });

      cleanup();
    });
  });

  describe('no-window / absent CMP resilience (Task E)', () => {
    test('window without __ucCmp and no event: adapter sets up listener, does not throw', async () => {
      const mockWindow = createMockWindow();
      // Neither __ucCmp nor UC_UI attached.

      await expect(
        setupV3Adapter({
          window: mockWindow as unknown as Window & typeof globalThis,
          elb: mockElb,
          settings: buildSettings(),
          logger: createMockLogger(),
        }),
      ).resolves.toBeDefined();

      expect(mockElb).not.toHaveBeenCalled();
      // Listener should be registered so a late-loading CMP still fires.
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'UC_UI_CMP_EVENT',
        expect.any(Function),
      );
    });
  });
});
