import type { WalkerOS, Elb, Source } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
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

/** The real jsdom window prepared for a test, plus its CMP helpers. */
export interface MockCmpWindow {
  window: Window & typeof globalThis;
  /** Delivers an event to every listener the source registered. */
  dispatch: (event: string, detail?: unknown) => void;
  /** Replaces the consent on the CookieFirst global. */
  setConsent: (consent: CookieFirstConsent | null) => void;
}

// Everything createMockWindow changed on the real window, undone by
// resetMockWindow.
const restores: Array<() => void> = [];

/**
 * Prepare the real jsdom window with a CookieFirst global and recorded event
 * listeners. addEventListener/removeEventListener are spied so tests can
 * assert on them; listeners are recorded instead of attached, so nothing
 * leaks onto the window between tests. Call resetMockWindow in afterEach.
 */
export function createMockWindow(
  consent: CookieFirstConsent | null = null,
  globalName = 'CookieFirst',
): MockCmpWindow {
  const listeners: Record<string, EventListenerOrEventListenerObject[]> = {};
  const api: CookieFirstAPI = { consent };
  window[globalName] = api;

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

  restores.push(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
    Reflect.deleteProperty(window, globalName);
  });

  return {
    window,
    dispatch: (event, detail) => {
      const e = detail ? new CustomEvent(event, { detail }) : new Event(event);
      listeners[event]?.forEach((handler) =>
        typeof handler === 'function' ? handler(e) : handler.handleEvent(e),
      );
    },
    setConsent: (newConsent) => {
      api.consent = newConsent;
    },
  };
}

/** Undo every createMockWindow since the last reset. */
export function resetMockWindow(): void {
  restores.splice(0).forEach((restore) => restore());
}

/**
 * Create and initialize a CookieFirst source with mock environment
 */
export async function createCookieFirstSource(
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
  const source = await sourceCookieFirst({
    collector,
    config: config || {},
    env,
    id: 'test-cookiefirst',
    logger: createMockLogger(),
    withScope: async (_r, respond, body) =>
      body({ ...env, ingest: createIngest('test-cookiefirst'), respond }),
  });
  // Adapter setup (listeners + static read) runs in init(), not the factory.
  await source.init?.();
  return source;
}
