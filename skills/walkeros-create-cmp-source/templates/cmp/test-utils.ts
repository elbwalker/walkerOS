import type { WalkerOS, Elb, Collector, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceCmpName } from '../index';
import type { Types, CmpConsent, CmpAPI } from '../types';

/**
 * Test utilities for CMP source testing.
 *
 * Key improvement: MockWindow is a proper interface with typed helper methods,
 * not scattered `as unknown as` casts (mandatory check #7).
 *
 * TODO: Add CMP-specific helpers for your window object shape.
 */

/** Track consent commands called via elb */
export interface ConsentCall {
  consent: WalkerOS.Consent;
}

/**
 * Properly typed MockWindow interface.
 * Extends the real window type with test-only helper methods.
 *
 * TODO: Add CMP-specific helpers like __setActiveGroups for CookiePro,
 * __setOneTrust for OneTrust, etc.
 */
export interface MockWindow extends Window {
  __dispatchEvent: (event: string, detail?: unknown) => void;
  __setConsent: (consent: CmpConsent | null) => void;
}

/** Create a mock elb function that tracks consent commands */
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
 * Create a mock window with CMP API.
 *
 * TODO: Replace 'CmpName' with your CMP's global name.
 */
export function createMockWindow(
  consent: CmpConsent | null = null,
  globalName = 'CmpName',
): MockWindow {
  const listeners: Record<string, Array<(e: Event) => void>> = {};

  const mockWindow = {
    [globalName]: {
      consent,
    } as CmpAPI,
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
    __dispatchEvent: (event: string, detail?: unknown) => {
      const e = detail ? new CustomEvent(event, { detail }) : new Event(event);
      listeners[event]?.forEach((handler) => handler(e));
    },
    __setConsent: (newConsent: CmpConsent | null) => {
      (mockWindow[globalName] as CmpAPI).consent = newConsent;
    },
  };

  return mockWindow as unknown as MockWindow;
}

/** Create and initialize a CMP source with mock environment */
export async function createCmpSource(
  mockWindow: MockWindow,
  mockElb: Elb.Fn,
  config?: Partial<Source.Config<Types>>,
): Promise<Source.Instance<Types>> {
  return await sourceCmpName({
    collector: {} as Collector.Instance,
    config: config || {},
    env: {
      push: mockElb,
      command: mockElb,
      elb: mockElb,
      window: mockWindow as unknown as Window & typeof globalThis,
      logger: createMockLogger(),
    },
    id: 'test-cmp-source',
    logger: createMockLogger(),
    setIngest: async () => {},
  });
}
