import { createMockLogger } from '@walkeros/core';
import type {
  CategoryData,
  ConsentData,
  ConsentDetails,
  Usercentrics,
} from 'usercentrics-browser-ui';
import { setupV3Adapter } from '../lib/v3';
import type { Settings } from '../types';
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
 * Minimal ConsentData stub. Fields not used by the adapter are set to
 * plausible minimums but must match the real type exactly.
 */
function buildConsentData(overrides: Partial<ConsentData> = {}): ConsentData {
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
 * Minimal CategoryData stub.
 */
function buildCategory(
  state: CategoryData['state'],
  name: string,
): CategoryData {
  return {
    state,
    dps: null,
    name,
  };
}

/**
 * Shape of the V3 window API subset the adapter needs. We use jest mocks so
 * each test can swap return values and assert call counts.
 */
interface MockUcCmp {
  isInitialized: jest.Mock<Promise<boolean>, []>;
  getConsentDetails: jest.Mock<Promise<ConsentDetails>, []>;
}

/**
 * Attach a __ucCmp mock onto the MockWindow. The adapter only uses
 * isInitialized and getConsentDetails, so we expose those and cast the
 * shape to the full Usercentrics interface at the boundary.
 */
function withUcCmp(mockWindow: MockWindow, ucCmp: MockUcCmp): void {
  (mockWindow as unknown as { __ucCmp: Usercentrics }).__ucCmp =
    ucCmp as unknown as Usercentrics;
}

/**
 * Dispatch a V3 event. The V3 event.detail is { source, type } — not the
 * same shape as the V2 UsercentricsEventDetail. We go through the mock
 * listener registry via a cast.
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
      const details: ConsentDetails = {
        consent: buildConsentData({
          status: 'SOME_ACCEPTED',
          type: 'EXPLICIT',
        }),
        services: {},
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

      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        essential: true,
        marketing: false,
        functional: true,
      });
      expect(mockElb).toHaveBeenCalledTimes(1);

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

  describe('pre-init event listener', () => {
    test('UC_UI_CMP_EVENT triggers a fresh getConsentDetails fetch and emits walker consent', async () => {
      const mockWindow = createMockWindow();
      // Start in a pre-init state: isInitialized false so no static read fires.
      const isInitialized = jest.fn().mockResolvedValue(false);
      const getConsentDetails = jest.fn();
      withUcCmp(mockWindow, { isInitialized, getConsentDetails });

      const cleanup = await setupV3Adapter({
        window: mockWindow as unknown as Window & typeof globalThis,
        elb: mockElb,
        settings: buildSettings(),
        logger: createMockLogger(),
      });

      // Static read should not have called getConsentDetails.
      expect(getConsentDetails).not.toHaveBeenCalled();
      expect(mockElb).not.toHaveBeenCalled();

      // Now UC finishes loading: event fires with just {source, type}. The
      // adapter must re-fetch getConsentDetails to get the real state.
      const details: ConsentDetails = {
        consent: buildConsentData({
          status: 'ALL_ACCEPTED',
          type: 'EXPLICIT',
        }),
        services: {},
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
          marketing: buildCategory('ALL_ACCEPTED', 'Marketing'),
        },
      };
      getConsentDetails.mockResolvedValue(details);

      dispatchV3Event(mockWindow, 'UC_UI_CMP_EVENT', {
        source: 'CMP',
        type: 'ACCEPT_ALL',
      });

      // Wait for the adapter's async listener to await getConsentDetails.
      await flushPromises();

      expect(getConsentDetails).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledTimes(1);
      expect(mockElb).toHaveBeenCalledWith('walker consent', {
        essential: true,
        marketing: true,
      });

      cleanup();
    });
  });

  describe('explicitOnly filtering via ConsentData.type', () => {
    test('IMPLICIT consent + explicitOnly=true → no elb call', async () => {
      const mockWindow = createMockWindow();
      withUcCmp(mockWindow, {
        isInitialized: jest.fn().mockResolvedValue(true),
        getConsentDetails: jest.fn().mockResolvedValue({
          consent: buildConsentData({
            status: 'SOME_ACCEPTED',
            type: 'IMPLICIT',
          }),
          services: {},
          categories: {
            essential: buildCategory('ALL_ACCEPTED', 'Essential'),
          },
        } satisfies ConsentDetails),
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
          consent: buildConsentData({
            status: 'SOME_ACCEPTED',
            type: 'IMPLICIT',
          }),
          services: {},
          categories: {
            essential: buildCategory('ALL_ACCEPTED', 'Essential'),
          },
        } satisfies ConsentDetails),
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
          consent: buildConsentData({
            status: 'ALL_ACCEPTED',
            type: 'EXPLICIT',
          }),
          services: {},
          categories: {
            essential: buildCategory('ALL_ACCEPTED', 'Essential'),
          },
        } satisfies ConsentDetails),
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
        consent: buildConsentData({
          status: 'ALL_ACCEPTED',
          type: 'EXPLICIT',
        }),
        services: {},
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
        },
      } satisfies ConsentDetails);
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
        consent: buildConsentData({
          status: 'ALL_ACCEPTED',
          type: 'EXPLICIT',
        }),
        services: {},
        categories: {
          essential: buildCategory('ALL_ACCEPTED', 'Essential'),
        },
      } satisfies ConsentDetails);
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
});
