import type { WalkerOS, Elb, Collector, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceCookieFirst } from '../index';
import type { Types, CookieFirstConsent, CookieFirstAPI } from '../types';

/**
 * Track consent commands called via elb
 */
export interface ConsentCall {
  consent: WalkerOS.Consent;
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
 * Create a mock window with CookieFirst API
 */
export function createMockWindow(
  consent: CookieFirstConsent | null = null,
  globalName = 'CookieFirst',
): Window & typeof globalThis {
  const listeners: Record<string, Array<(e: Event) => void>> = {};

  const mockWindow = {
    [globalName]: {
      consent,
    } as CookieFirstAPI,
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
    // Helper to dispatch events in tests
    __dispatchEvent: (event: string, detail?: unknown) => {
      const e = detail ? new CustomEvent(event, { detail }) : new Event(event);
      listeners[event]?.forEach((handler) => handler(e));
    },
    // Helper to update consent
    __setConsent: (newConsent: CookieFirstConsent | null) => {
      (mockWindow[globalName] as CookieFirstAPI).consent = newConsent;
    },
  };

  return mockWindow as unknown as Window & typeof globalThis;
}

/**
 * Create and initialize a CookieFirst source with mock environment
 */
export async function createCookieFirstSource(
  mockWindow: Window & typeof globalThis,
  mockElb: Elb.Fn,
  config?: Partial<Source.Config<Types>>,
): Promise<Source.Instance<Types>> {
  return await sourceCookieFirst({
    collector: {} as Collector.Instance,
    config: config || {},
    env: {
      push: mockElb,
      command: mockElb,
      elb: mockElb,
      window: mockWindow,
      logger: createMockLogger(),
    },
    id: 'test-cookiefirst',
    logger: createMockLogger(),
    setIngest: async () => {},
  });
}
