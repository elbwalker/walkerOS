import type { WalkerOS, Elb, Source } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceCookiePro } from '../index';
import type { Types, OneTrustAPI } from '../types';

/**
 * Track consent commands called via elb
 */
export interface ConsentCall {
  consent: WalkerOS.Consent;
}

/** Test helpers the mock window carries beside the Window API. */
export interface MockWindowHelpers {
  __dispatchEvent: (event: string) => void;
  __setActiveGroups: (groups: string) => void;
  __setOneTrust: (api: OneTrustAPI) => void;
}

/** The real jsdom window, prepared for CookiePro/OneTrust testing. */
export type MockWindow = Window & typeof globalThis & MockWindowHelpers;

/**
 * Create a mock elb function that tracks consent commands
 */
export function createMockElb(
  consentCalls: ConsentCall[],
): jest.MockedFunction<Elb.Fn> {
  const mockElb: jest.MockedFunction<Elb.Fn> = jest
    .fn()
    .mockImplementation((command: string, data?: WalkerOS.Consent) => {
      if (command === 'walker consent' && data) {
        consentCalls.push({ consent: data });
      }
      return Promise.resolve({ ok: true });
    });

  return mockElb;
}

/**
 * Options for creating a mock window
 */
export interface MockWindowOptions {
  /** Initial OptanonActiveGroups string */
  activeGroups?: string;
  /** Whether OneTrust SDK is loaded */
  sdkLoaded?: boolean;
  /** Whether IsAlertBoxClosed returns true */
  alertBoxClosed?: boolean;
  /** Custom global name for OneTrust */
  globalName?: string;
  /** Initial OptanonWrapper function (set before source init to test preservation) */
  initialOptanonWrapper?: () => void;
}

// Everything createMockWindow changed on the real window, undone by
// resetMockWindow.
const restores: Array<() => void> = [];

/**
 * Prepare the real jsdom window with the OneTrust globals the options ask
 * for and recorded event listeners. addEventListener/removeEventListener are
 * spied so tests can assert on them; listeners are recorded instead of
 * attached, so nothing leaks onto the window between tests. Call
 * resetMockWindow in afterEach.
 */
export function createMockWindow(options: MockWindowOptions = {}): MockWindow {
  const {
    activeGroups,
    sdkLoaded = false,
    alertBoxClosed = false,
    globalName = 'OneTrust',
    initialOptanonWrapper,
  } = options;

  const listeners: Record<string, EventListenerOrEventListenerObject[]> = {};

  const oneTrustApi: OneTrustAPI = {
    IsAlertBoxClosed: jest.fn(() => alertBoxClosed),
  };

  const addSpy = jest
    .spyOn(window, 'addEventListener')
    .mockImplementation((event, handler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    });
  const removeSpy = jest
    .spyOn(window, 'removeEventListener')
    .mockImplementation((event, handler) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    });

  // Set SDK as loaded if requested
  if (sdkLoaded) {
    window[globalName] = oneTrustApi;
    window.Optanon = {};
  }
  // Set active groups if provided
  if (activeGroups !== undefined) window.OptanonActiveGroups = activeGroups;
  // Set initial OptanonWrapper if provided
  if (initialOptanonWrapper) window.OptanonWrapper = initialOptanonWrapper;

  const helpers: MockWindowHelpers = {
    __dispatchEvent: (event) => {
      const e = new Event(event);
      listeners[event]?.forEach((handler) =>
        typeof handler === 'function' ? handler(e) : handler.handleEvent(e),
      );
    },
    __setActiveGroups: (groups) => {
      window.OptanonActiveGroups = groups;
    },
    __setOneTrust: (api) => {
      window[globalName] = api;
      window.Optanon = {};
    },
  };

  restores.push(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
    for (const key of [
      globalName,
      'Optanon',
      'OptanonActiveGroups',
      'OptanonWrapper',
      ...Object.keys(helpers),
    ]) {
      Reflect.deleteProperty(window, key);
    }
  });

  return Object.assign(window, helpers);
}

/** Undo every createMockWindow since the last reset. */
export function resetMockWindow(): void {
  restores.splice(0).forEach((restore) => restore());
}

/**
 * Create and initialize a CookiePro source with mock environment
 */
export async function createCookieProSource(
  mockWindow: Window & typeof globalThis,
  mockElb: Elb.Fn,
  config?: Partial<Source.Config<Types>>,
): Promise<Source.Instance<Types>> {
  // The source never reads its collector; a real one stands in for a stub.
  const { collector } = await startFlow({ run: false });
  const env: Types['env'] = {
    push: mockElb,
    command: mockElb,
    elb: mockElb,
    window: mockWindow,
    logger: createMockLogger(),
  };
  const source = await sourceCookiePro({
    collector,
    config: config || {},
    env,
    id: 'test-cookiepro',
    logger: createMockLogger(),
    withScope: async (_r, respond, body) =>
      body({ ...env, ingest: createIngest('test-cookiepro'), respond }),
  });
  // Adapter setup (listeners + static read) runs in init(), not the factory.
  await source.init?.();
  return source;
}
