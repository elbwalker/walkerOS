import type { WalkerOS, Elb, Source, MockLogger } from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceCookieConsent } from '../index';
import { createCookieConsentApi } from '../examples/env';
import type { CookieConsentInput } from '../examples/inputs';
import type { Types, Settings, CookieConsentWindow } from '../types';

/**
 * Track consent commands called via elb
 */
export interface ConsentCall {
  consent: WalkerOS.Consent;
}

/**
 * The window surface the source touches, plus test helpers. Listeners are
 * recorded, so a test fires CookieConsent's events by name.
 */
export interface MockWindow extends CookieConsentWindow {
  addEventListener: jest.Mock<void, [string, EventListener]>;
  removeEventListener: jest.Mock<void, [string, EventListener]>;
  /** Fire a window event the way CookieConsent does, as a CustomEvent. */
  __dispatch(name: string): void;
  /** Number of listeners currently attached for an event. */
  __listeners(name: string): number;
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
 * Create a mock window, with CookieConsent loaded when an input is given.
 */
export function createMockWindow(input?: CookieConsentInput): MockWindow {
  const listeners: Record<string, EventListener[]> = {};

  return {
    CookieConsent: input ? createCookieConsentApi(input) : undefined,
    addEventListener: jest.fn((name: string, handler: EventListener) => {
      (listeners[name] ??= []).push(handler);
    }),
    removeEventListener: jest.fn((name: string, handler: EventListener) => {
      listeners[name] = (listeners[name] ?? []).filter((h) => h !== handler);
    }),
    __dispatch: (name) => {
      const event = new CustomEvent(name);
      (listeners[name] ?? []).forEach((handler) => handler(event));
    },
    __listeners: (name) => (listeners[name] ?? []).length,
  };
}

/**
 * Create a CookieConsent source with a mock environment, `logger` as its
 * `env.logger`. Runs init() unless `init: false`, so a test can inspect the
 * factory alone.
 */
export async function createCookieConsentSource(
  mockWindow: CookieConsentWindow | undefined,
  mockElb: Elb.Fn,
  settings?: Partial<Settings>,
  logger: MockLogger = createMockLogger(),
  options: { init?: boolean } = {},
): Promise<Source.Instance<Types>> {
  // The source never reads its collector; a real one stands in for a stub.
  const { collector } = await startFlow({ run: false });
  const env: Types['env'] = {
    push: mockElb,
    command: mockElb,
    elb: mockElb,
    window: mockWindow,
    logger,
  };
  const source = await sourceCookieConsent({
    collector,
    config: settings ? { settings } : {},
    env,
    id: 'test-cookieconsent',
    logger: createMockLogger(),
    withScope: async (_r, respond, body) =>
      body({ ...env, ingest: createIngest('test-cookieconsent'), respond }),
  });
  // Listener setup and the static read run in init(), not the factory.
  if (options.init !== false) await source.init?.();
  return source;
}
