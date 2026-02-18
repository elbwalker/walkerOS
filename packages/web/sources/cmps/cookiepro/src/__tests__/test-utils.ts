import type { WalkerOS, Elb, Collector, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceCookiePro } from '../index';
import type { Types, OneTrustAPI } from '../types';

/**
 * Track consent commands called via elb
 */
export interface ConsentCall {
  consent: WalkerOS.Consent;
}

/**
 * Mock window with test helpers for CookiePro/OneTrust testing
 */
export interface MockWindow extends Window {
  OneTrust?: OneTrustAPI;
  OptanonActiveGroups?: string;
  OptanonWrapper?: () => void;
  Optanon?: unknown;
  __dispatchEvent: (event: string) => void;
  __setActiveGroups: (groups: string) => void;
  __setOneTrust: (api: OneTrustAPI) => void;
}

/**
 * Create a mock elb function that tracks consent commands
 */
export function createMockElb(consentCalls: ConsentCall[]) {
  const mockElb = jest.fn();

  mockElb.mockImplementation((command: string, data?: WalkerOS.Consent) => {
    if (command === 'walker consent' && data) {
      consentCalls.push({ consent: data });
    }
    return Promise.resolve({ ok: true });
  });

  return mockElb as jest.MockedFunction<Elb.Fn>;
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

/**
 * Create a mock window that supports addEventListener/removeEventListener
 * and can simulate OneTrust SDK behavior for testing.
 */
export function createMockWindow(options: MockWindowOptions = {}): MockWindow {
  const {
    activeGroups,
    sdkLoaded = false,
    alertBoxClosed = false,
    globalName = 'OneTrust',
    initialOptanonWrapper,
  } = options;

  const listeners: Record<string, Array<(e: Event) => void>> = {};

  const oneTrustApi: OneTrustAPI = {
    IsAlertBoxClosed: jest.fn(() => alertBoxClosed),
  };

  const mockWindow: Record<string, unknown> = {
    addEventListener: jest.fn((event: string, handler: (e: Event) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    removeEventListener: jest.fn(
      (event: string, handler: (e: Event) => void) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((h) => h !== handler);
        }
      },
    ),
    // Set SDK as loaded if requested
    ...(sdkLoaded ? { [globalName]: oneTrustApi, Optanon: {} } : {}),
    // Set active groups if provided
    ...(activeGroups !== undefined
      ? { OptanonActiveGroups: activeGroups }
      : {}),
    // Set initial OptanonWrapper if provided
    ...(initialOptanonWrapper ? { OptanonWrapper: initialOptanonWrapper } : {}),
    // Test helpers
    __dispatchEvent: (event: string) => {
      const e = new Event(event);
      listeners[event]?.forEach((handler) => handler(e));
    },
    __setActiveGroups: (groups: string) => {
      mockWindow.OptanonActiveGroups = groups;
    },
    __setOneTrust: (api: OneTrustAPI) => {
      mockWindow[globalName] = api;
      mockWindow.Optanon = {};
    },
  };

  return mockWindow as unknown as MockWindow;
}

/**
 * Create and initialize a CookiePro source with mock environment
 */
export async function createCookieProSource(
  mockWindow: MockWindow,
  mockElb: Elb.Fn,
  config?: Partial<Source.Config<Types>>,
): Promise<Source.Instance<Types>> {
  return await sourceCookiePro({
    collector: {} as Collector.Instance,
    config: config || {},
    env: {
      push: mockElb,
      command: mockElb,
      elb: mockElb,
      window: mockWindow as unknown as Window & typeof globalThis,
      logger: createMockLogger(),
    },
    id: 'test-cookiepro',
    logger: createMockLogger(),
    setIngest: async () => {},
  });
}
