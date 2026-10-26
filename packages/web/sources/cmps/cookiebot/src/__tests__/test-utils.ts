import type { WalkerOS, Elb, Source } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceCookiebot } from '../index';
import type { Types, CookiebotAPI, CookiebotWindow } from '../types';

/**
 * Track consent commands called via elb
 */
export interface ConsentCall {
  consent: WalkerOS.Consent;
}

/**
 * The window surface the source touches, plus test helpers. Listeners are
 * recorded, so a test fires Cookiebot's events by name.
 */
export interface MockWindow extends CookiebotWindow {
  addEventListener: jest.Mock<void, [string, EventListener]>;
  removeEventListener: jest.Mock<void, [string, EventListener]>;
  /** Fire a window event the way Cookiebot's uc.js does. */
  __fire: (event: string) => void;
  /** Number of listeners currently attached for an event. */
  __listenerCount: (event: string) => number;
}

/**
 * Create a mock elb function that tracks consent commands
 */
export function createMockElb(
  consentCalls: ConsentCall[],
): jest.MockedFunction<Elb.Fn> {
  return jest
    .fn()
    .mockImplementation((command: string, data?: WalkerOS.Consent) => {
      if (command === 'walker consent' && data) {
        consentCalls.push({ consent: data });
      }
      return Promise.resolve({ ok: true });
    });
}

/**
 * Create a mock window, optionally with Cookiebot already loaded.
 */
export function createMockWindow(cookiebot?: CookiebotAPI): MockWindow {
  const listeners: Record<string, EventListener[]> = {};

  return {
    Cookiebot: cookiebot,
    addEventListener: jest.fn((event: string, handler: EventListener) => {
      (listeners[event] ??= []).push(handler);
    }),
    removeEventListener: jest.fn((event: string, handler: EventListener) => {
      listeners[event] = (listeners[event] ?? []).filter((h) => h !== handler);
    }),
    __fire: (event) => {
      const e = new Event(event);
      (listeners[event] ?? []).forEach((handler) => handler(e));
    },
    __listenerCount: (event) => (listeners[event] ?? []).length,
  };
}

/**
 * Create a Cookiebot source with a mock environment. Runs init() unless
 * `init: false`, so a test can inspect the factory alone.
 */
export async function createCookiebotSource(
  mockWindow: CookiebotWindow,
  mockElb: Elb.Fn,
  config?: Partial<Source.Config<Types>>,
  options: { init?: boolean } = {},
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
  const source = await sourceCookiebot({
    collector,
    config: config || {},
    env,
    id: 'test-cookiebot',
    logger: createMockLogger(),
    withScope: async (_r, respond, body) =>
      body({ ...env, ingest: createIngest('test-cookiebot'), respond }),
  });
  // Listener setup and the static read run in init(), not the factory.
  if (options.init !== false) await source.init?.();
  return source;
}
