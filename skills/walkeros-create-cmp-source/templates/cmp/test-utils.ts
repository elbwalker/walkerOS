import type { WalkerOS, Elb, Collector, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceCmpName } from '../index';
import type { Types, CmpConsent, CmpAPI, CmpWindow } from '../types';

/**
 * Test utilities for CMP source testing.
 *
 * Key improvement: MockWindow is a proper interface with typed helper methods,
 * built cast-free. It extends the narrowed `CmpWindow` (the surface the source
 * actually touches), NOT the global `Window`, so the mock literal satisfies it
 * directly without `as unknown as Window` (mandatory check #7).
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
export interface MockWindow extends CmpWindow {
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

  // Hold the CMP API in a typed local so `__setConsent` mutates it without a
  // cast. The same object is exposed under the dynamic global name.
  const cmp: CmpAPI = { consent };

  const mockWindow: MockWindow = {
    [globalName]: cmp,
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
      cmp.consent = newConsent;
    },
  };

  return mockWindow;
}

/** Create and initialize a CMP source with mock environment */
export async function createCmpSource(
  mockWindow: MockWindow,
  mockElb: Elb.Fn,
  config?: Partial<Source.Config<Types>>,
): Promise<Source.Instance<Types>> {
  const source = await sourceCmpName({
    collector: {} as Collector.Instance,
    config: config || {},
    env: {
      push: mockElb,
      command: mockElb,
      elb: mockElb,
      window: mockWindow, // MockWindow extends the narrowed CmpWindow — no cast
      logger: createMockLogger(),
    },
    id: 'test-cmp-source',
    logger: createMockLogger(),
    withScope: async (_r, _resp, body) => body({} as never),
  });
  // Adapter setup (listeners + static read) runs in init(), not the factory.
  await source.init?.();
  return source;
}
