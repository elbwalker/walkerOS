import type { Collector, Hooks, Logger, Elb } from '../../types';

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
