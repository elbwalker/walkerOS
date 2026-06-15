import type { WalkerOS, Elb, Collector, Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceUsercentrics } from '../index';
import type {
  Types,
  UsercentricsConsentType,
  UsercentricsV2Api,
  UsercentricsV2Service,
  UsercentricsV3CmpEventDetail,
} from '../types';

/**
 * Track consent commands called via elb
 */
export interface ConsentCall {
  consent: WalkerOS.Consent;
}

/**
 * Mock window with test helpers for dispatching the official Usercentrics V2
 * events (`UC_UI_INITIALIZED`, `UC_UI_CMP_EVENT`) and for attaching a typed
 * `UC_UI` API mock. No scattered casts: the mock is built against a typed
 * interface and cast once at the `env.window` boundary inside the source
 * factory helper.
 */
export interface MockWindow extends Window {
  /** Dispatch the synchronous `UC_UI_INITIALIZED` lifecycle event. */
  __dispatchInitialized: () => void;
  /** Dispatch a `UC_UI_CMP_EVENT` with the given V3 CMP event detail. */
  __dispatchCmpEvent: (detail: UsercentricsV3CmpEventDetail) => void;
  /** Attach (or replace) the `window.UC_UI` V2 API mock. */
  __setUcUi: (ucUi: UsercentricsV2Api) => void;
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
 * Build a single V2 service entry. When `historyType` is provided the service
 * carries a one-entry consent history with that type, which the explicit-gate
 * inspects. `name` is the service display name surfaced as a service-level key.
 */
export function makeV2Service(
  categorySlug: string,
  status: boolean,
  historyType?: UsercentricsConsentType,
  name?: string,
): UsercentricsV2Service {
  return {
    categorySlug,
    ...(name !== undefined ? { name } : {}),
    consent: {
      status,
      ...(historyType !== undefined
        ? { history: [{ type: historyType, status }] }
        : {}),
    },
  };
}

/**
 * Build a UC_UI V2 API mock from a fixed service list. Defaults to
 * `isInitialized() === true`; override per-case for the not-yet-initialized
 * path.
 */
export function makeUcUi(
  services: UsercentricsV2Service[],
  overrides: Partial<UsercentricsV2Api> = {},
): UsercentricsV2Api {
  return {
    isInitialized: () => true,
    getServicesBaseInfo: () => services,
    ...overrides,
  };
}

/**
 * Create a mock window that supports addEventListener/removeEventListener,
 * carries a typed optional `UC_UI`, and can dispatch the official Usercentrics
 * events for testing.
 */
export function createMockWindow(): MockWindow {
  const listeners: Record<string, Array<(e: Event) => void>> = {};
  let ucUi: UsercentricsV2Api | undefined;

  const mockWindow: Pick<Window, 'addEventListener' | 'removeEventListener'> & {
    UC_UI?: UsercentricsV2Api;
    __dispatchInitialized: MockWindow['__dispatchInitialized'];
    __dispatchCmpEvent: MockWindow['__dispatchCmpEvent'];
    __setUcUi: MockWindow['__setUcUi'];
  } = {
    get UC_UI() {
      return ucUi;
    },
    addEventListener: jest.fn((event: string, handler: (e: Event) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }) as unknown as Window['addEventListener'],
    removeEventListener: jest.fn(
      (event: string, handler: (e: Event) => void) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((h) => h !== handler);
        }
      },
    ) as unknown as Window['removeEventListener'],
    __setUcUi: (next: UsercentricsV2Api) => {
      ucUi = next;
    },
    __dispatchInitialized: () => {
      const e = new Event('UC_UI_INITIALIZED');
      listeners['UC_UI_INITIALIZED']?.forEach((handler) => handler(e));
    },
    __dispatchCmpEvent: (detail: UsercentricsV3CmpEventDetail) => {
      const e = new CustomEvent('UC_UI_CMP_EVENT', { detail });
      listeners['UC_UI_CMP_EVENT']?.forEach((handler) => handler(e));
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
