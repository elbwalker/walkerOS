import type { WalkerOS, Elb, Collector, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceUsercentrics } from '../index';
import type { Types, UsercentricsEventDetail } from '../types';

/**
 * Track consent commands called via elb
 */
export interface ConsentCall {
  consent: WalkerOS.Consent;
}

/**
 * Mock window with test helpers for dispatching events
 */
export interface MockWindow extends Window {
  __dispatchEvent: (event: string, detail?: UsercentricsEventDetail) => void;
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
 * Create a mock window that supports addEventListener/removeEventListener
 * and can dispatch Usercentrics events for testing.
 */
export function createMockWindow(): MockWindow {
  const listeners: Record<string, Array<(e: Event) => void>> = {};

  const mockWindow = {
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
    __dispatchEvent: (event: string, detail?: UsercentricsEventDetail) => {
      const e = detail ? new CustomEvent(event, { detail }) : new Event(event);
      listeners[event]?.forEach((handler) => handler(e));
    },
  };

  return mockWindow as unknown as MockWindow;
}

/**
 * Create and initialize a Usercentrics source with mock environment.
 *
 * The factory is side-effect-free; the adapter setup (listeners + static
 * consent read) runs in `init()`. This helper calls `init()` after
 * construction so behavior tests observe a fully set-up source, mirroring how
 * the collector drives sources (factory in Pass 1, init in Pass 2).
 */
export async function createUsercentricsSource(
  mockWindow: MockWindow,
  mockElb: Elb.Fn,
  config?: Partial<Source.Config<Types>>,
): Promise<Source.Instance<Types>> {
  const source = await sourceUsercentrics({
    collector: {} as Collector.Instance,
    config: config || {},
    env: {
      push: mockElb,
      command: mockElb,
      elb: mockElb,
      window: mockWindow as unknown as Window & typeof globalThis,
      logger: createMockLogger(),
    },
    id: 'test-usercentrics',
    logger: createMockLogger(),
    withScope: async (_r, _resp, body) => body({} as never),
  });
  await source.init?.();
  return source;
}
