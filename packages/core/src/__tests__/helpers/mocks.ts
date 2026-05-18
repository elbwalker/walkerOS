import type { Collector, Hooks, Logger, Elb, Store } from '../../types';

/**
 * Build a typed `Collector.Instance` test double.
 *
 * Adds only the keys callers actually reference; if a test needs more,
 * extend this helper rather than casting at the call site. The trailing
 * `as Collector.Instance` here is a documented boundary cast — the
 * interface is large and tests only ever use a handful of fields. The
 * helper accepts a typed `Partial<>` so call sites stay fully type-checked.
 */
export function createMockCollector(
  overrides: Partial<Collector.Instance> = {},
): Collector.Instance {
  const base = {
    config: { tagging: 0, verbose: false },
    consent: {},
    custom: {},
    destinations: {},
    sources: {},
    transformers: {},
    stores: {},
    globals: {},
    group: '',
    hooks: {},
    user: {},
    queue: [],
    round: 0,
    count: 0,
    timing: 0,
    allowed: false,
    on: {},
    push: jest.fn(),
    logger: createMockLogger(),
    ...overrides,
  };
  return base as Collector.Instance;
}

/**
 * Build a typed `Hooks.Functions` test double. Pass per-hook jest fns.
 *
 * `Hooks.Functions` is an open `[key: string]: AnyFunction` map — the
 * cast here narrows from `Partial<Hooks.Functions>` (where every value
 * may be undefined) to the indexable type tests expect. Documented
 * boundary cast.
 */
export function createMockHooks(
  overrides: Partial<Hooks.Functions> = {},
): Hooks.Functions {
  return { ...overrides } as Hooks.Functions;
}

/**
 * Build a no-op typed `Logger.Instance`. Pass overrides to assert calls.
 *
 * The trailing `as Logger.Instance` is a documented boundary cast — the
 * interface includes `scope` returning a fresh `Instance`, which is not
 * something tests need to mock fully.
 */
export function createMockLogger(
  overrides: Partial<Logger.Instance> = {},
): Logger.Instance {
  return {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    json: jest.fn(),
    throw: jest.fn((message: string | Error) => {
      throw message instanceof Error ? message : new Error(message);
    }),
    scope: jest.fn(),
    ...overrides,
  } as Logger.Instance;
}

/**
 * Build a sync, Map-backed `Store.Instance` test double. Exposed alongside
 * `createAsyncMockStore` so tests can wire either shape without reinventing
 * the boilerplate. The `_data` map is returned on the instance for tests
 * that need to pre-seed entries or assert on raw state.
 */
export function createMockStore(): Store.Instance & {
  _data: Map<string, unknown>;
} {
  const data = new Map<string, unknown>();
  return {
    type: 'mock',
    config: {},
    _data: data,
    get: (key: string) => data.get(key),
    set: (key: string, value: unknown) => {
      data.set(key, value);
    },
    delete: (key: string) => {
      data.delete(key);
    },
  };
}

/**
 * Build an async, Map-backed `Store.Instance` test double. Mirrors
 * `createMockStore` but every method returns a Promise, so consumers of
 * `Store.GetFn`'s `T | undefined | Promise<T | undefined>` union are
 * exercised on the async branch. Use this to verify that callers of
 * `checkCache` (and any other code reading `store.get`) await the
 * result instead of treating the returned Promise as a value.
 */
export function createAsyncMockStore(): Store.Instance & {
  _data: Map<string, unknown>;
} {
  const data = new Map<string, unknown>();
  return {
    type: 'async-mock',
    config: {},
    _data: data,
    get: async (key: string) => data.get(key),
    set: async (key: string, value: unknown) => {
      data.set(key, value);
    },
    delete: async (key: string) => {
      data.delete(key);
    },
  };
}

/**
 * Build a typed `Elb.Fn` no-op. Returns a jest fn so callers can assert.
 *
 * `Elb.Fn` is an overloaded function type and `jest.fn()`'s `Mock` type
 * cannot be assigned to it directly without a cast — even though the
 * runtime value is structurally compatible. This is the one acceptable
 * cast in the test helpers (per AGENT.md type-safety rules).
 */
export function createMockElb(): Elb.Fn {
  // Boundary cast: jest.fn() is structurally compatible with Elb.Fn at
  // runtime, but the overloaded function signature cannot be matched
  // by a generic Mock type without going through `unknown`.
  return jest.fn() as unknown as Elb.Fn;
}
