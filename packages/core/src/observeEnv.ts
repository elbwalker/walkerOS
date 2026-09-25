import type { Destination, Simulation } from './types';

/**
 * Env key under which the collector injects the observe-mode call recorder
 * (`Destination.EnvObserve`) into a per-push env. The resolution-point wrapper
 * strips this key before handing the env to the destination.
 */
export const OBSERVE_ENV_KEY = 'observe' as const;

/**
 * Structural guard for `Destination.EnvObserve`: an object whose `paths` is a
 * string array and whose `record` is a function. Extra keys are tolerated.
 */
export function isEnvObserve(value: unknown): value is Destination.EnvObserve {
  if (typeof value !== 'object' || value === null) return false;
  if (!('paths' in value) || !('record' in value)) return false;
  const { paths, record } = value;
  return (
    Array.isArray(paths) &&
    paths.every((path) => typeof path === 'string') &&
    typeof record === 'function'
  );
}

/**
 * Prefix marking a dot-path as a recordable call. Only this literal prefix is
 * stripped; a `<word>:` that is not `call:` stays part of the path (`wrapEnv`
 * parity).
 */
const CALL_PREFIX = 'call:';

/**
 * Parse a `simulation`/`calls` dot-path into segments, sharing one grammar with
 * `wrapEnv` so the two capture layers cannot drift. Strips a single leading
 * `call:` prefix (only the literal `call:`, never any other `<word>:`), then
 * splits on `.`. An empty path or any empty segment (leading, trailing, or
 * consecutive dots) is unresolvable and yields `[]`.
 */
export function parseCallPath(raw: string): string[] {
  const path = raw.startsWith(CALL_PREFIX)
    ? raw.slice(CALL_PREFIX.length)
    : raw;
  const segments = path.split('.');
  if (segments.some((segment) => segment === '')) return [];
  return segments;
}

/** One declared path, as the segments still to walk plus the recorded name. */
interface Tracked {
  rest: string[];
  fn: string;
}

type Callable = (...args: unknown[]) => unknown;

export interface ObservedEnv<T extends object = Record<string, unknown>> {
  /** Proxy view of the env; declared paths record, everything else passes through. */
  env: T;
  /**
   * Mutable array: each call on a declared path is pushed here once. Stays
   * empty when a `record` callback is given, which then receives every call.
   */
  calls: Simulation.Call[];
  /**
   * Declared paths whose object intermediates or leaf are absent at wrap time,
   * as the post-`call:` dot-path. A path that continues through a function
   * (constructor, factory, method result) resolves lazily and is not listed.
   */
  unresolved: string[];
}

function isCallable(value: unknown): value is Callable {
  return typeof value === 'function';
}

function isNavigable(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return isNavigable(value) && 'then' in value && isCallable(value.then);
}

/**
 * Own keys every function carries. A path segment with one of these names is
 * never a static; it continues on the call result.
 */
const FUNCTION_KEYS = ['name', 'length', 'prototype', 'arguments', 'caller'];

/**
 * Whether `key` is a static of `fn`: an own property of the function or of a
 * parent class, never a standard function key and never inherited from a
 * realm's `Function.prototype` (`call`, `bind`, `apply`, `toString`, ...).
 */
function hasStatic(fn: Callable, key: string): boolean {
  if (FUNCTION_KEYS.indexOf(key) !== -1) return false;
  let current: unknown = fn;
  while (isCallable(current)) {
    if (Object.prototype.hasOwnProperty.call(current, key)) return true;
    const parent: unknown = Object.getPrototypeOf(current);
    // A realm's Function.prototype is the callable whose prototype is not.
    if (!isCallable(parent) || !isCallable(Object.getPrototypeOf(parent))) {
      return false;
    }
    current = parent;
  }
  return false;
}

/**
 * A Proxy may only return a different value for a property when the target's
 * own descriptor allows it (a non-configurable, non-writable data property
 * must read back unchanged).
 */
function canSubstitute(target: object, key: string): boolean {
  const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
  if (!descriptor || descriptor.configurable) return true;
  return 'value' in descriptor ? descriptor.writable === true : false;
}

function isPlainData(value: object): boolean {
  if (Array.isArray(value)) return true;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function trackedKey(tracked: Tracked[]): string {
  return tracked.map((t) => `${t.fn}:${t.rest.join('.')}`).join('|');
}

/**
 * Walk a declared path at wrap time. Object intermediates must exist and the
 * leaf must be a function; once the walk reaches a function whose next segment
 * is not a static of it (or a Promise without that property), the rest
 * resolves at call time. A static the function view cannot substitute (a
 * frozen function) is unresolvable.
 */
function resolvesAtWrapTime(env: object, segments: string[]): boolean {
  let current: unknown = env;
  for (const segment of segments) {
    if (isCallable(current)) {
      if (!hasStatic(current, segment)) return true;
      if (!canSubstitute(current, segment)) return false;
    } else if (isThenable(current)) {
      if (!(segment in current)) return true;
    } else if (!isNavigable(current) || !(segment in current)) {
      return false;
    }
    current = Reflect.get(current, segment);
  }
  return isCallable(current);
}

/**
 * Observe calls on declared dot-paths of an env without touching it.
 *
 * Returns a Proxy view of `env`. Declared paths use the `parseCallPath`
 * grammar; the recorded `fn` is the full path without `call:` and `args` are
 * the leaf call's arguments. After an object, a segment is a property of it.
 * After a function, a segment is a static (see `hasStatic`) or else continues
 * on the call result (or constructed instance); a Promise result is followed
 * with `.then`. An object whose tracked properties a Proxy may not substitute
 * (frozen, or non-writable and non-configurable) is viewed through a shadow
 * target, so its calls still record and the object itself is never changed. Apply and construct traps call the originals through
 * `Reflect`, with `this` bound to the real target, so `instanceof`, statics and
 * `#private` fields keep working and a chain that returns `this` records once.
 * Nothing on the caller's objects or prototypes is replaced. `record`, when
 * given, receives every call instead of `calls` (a long-lived view must not
 * grow an array); a throw there never stops the real call.
 */
export function observeEnv<T extends object = Record<string, unknown>>(
  env: T,
  paths: string[],
  record?: Destination.EnvObserve['record'],
): ObservedEnv<T> {
  const calls: Simulation.Call[] = [];
  const unresolved: string[] = [];
  const tracked: Tracked[] = [];

  for (const raw of paths) {
    const segments = parseCallPath(raw);
    if (segments.length === 0) continue;
    const fn = segments.join('.');
    tracked.push({ rest: segments, fn });
    if (!resolvesAtWrapTime(env, segments)) unresolved.push(fn);
  }

  const objectProxies = new WeakMap<object, Map<string, object>>();
  // Every view this call hands out. A view written back into the env (gtm's
  // `window[name] = dataLayer`) is returned as is on the next read, never
  // wrapped a second time, so its calls still record once.
  const views = new WeakSet<object>();

  function recordCall(leafs: string[], args: unknown[]): void {
    for (const fn of leafs) {
      if (!record) {
        calls.push({ fn, args, ts: Date.now() });
        continue;
      }
      try {
        record(fn, args);
      } catch {
        // Telemetry must never suppress the real vendor call.
      }
    }
  }

  function navigate(value: unknown, next: Tracked[]): unknown {
    if (next.length === 0 || isView(value)) return value;
    if (isThenable(value) && !next.some((t) => t.rest[0] in value)) {
      return Promise.resolve(value).then((resolved) =>
        navigate(resolved, next),
      );
    }
    if (isCallable(value)) return wrapFunction(value, [], next);
    if (isNavigable(value)) return wrapObject(value, next);
    return value;
  }

  function isView(value: unknown): boolean {
    return (isNavigable(value) || isCallable(value)) && views.has(value);
  }

  /** Tracked paths whose next segment is `key`, split into leafs and deeper. */
  function select(
    all: Tracked[],
    key: string,
  ): { leafs: string[]; deeper: Tracked[] } {
    const leafs: string[] = [];
    const deeper: Tracked[] = [];
    for (const t of all) {
      if (t.rest[0] !== key) continue;
      if (t.rest.length === 1) {
        if (!leafs.includes(t.fn)) leafs.push(t.fn);
      } else {
        deeper.push({ rest: t.rest.slice(1), fn: t.fn });
      }
    }
    return { leafs, deeper };
  }

  /** Cached per target and tracked set, so identity stays stable. */
  function wrapObject(target: object, next: Tracked[]): object {
    const key = trackedKey(next);
    const byKey = objectProxies.get(target) ?? new Map<string, object>();
    objectProxies.set(target, byKey);
    const cached = byKey.get(key);
    if (cached) return cached;
    const shadowed = next.some((t) => !canSubstitute(target, t.rest[0]));
    const proxy = shadowed
      ? createShadowProxy(target, next)
      : createObjectProxy(target, next);
    byKey.set(key, proxy);
    return proxy;
  }

  /**
   * A view of `target` whose Proxy target is an empty object with the same
   * prototype. Proxy invariants then bind the shadow, not the real object, so
   * frozen properties can be substituted. Reads, writes and reflection all
   * forward to the real object; descriptors report as configurable, since the
   * shadow does not hold them.
   */
  function createShadowProxy(target: object, next: Tracked[]): object {
    const shadow: object = Object.create(Object.getPrototypeOf(target));
    const reads = objectHandler(target, next, () => proxy);
    const proxy: object = new Proxy(shadow, {
      get: (_, prop) => reads.get(prop),
      set: (_, prop, value) => Reflect.set(target, prop, value, target),
      has: (_, prop) => Reflect.has(target, prop),
      ownKeys: () => Reflect.ownKeys(target),
      getOwnPropertyDescriptor(_, prop) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
        return descriptor && { ...descriptor, configurable: true };
      },
      defineProperty: (_, prop, descriptor) =>
        Reflect.defineProperty(target, prop, descriptor),
      deleteProperty: (_, prop) => Reflect.deleteProperty(target, prop),
    });
    views.add(proxy);
    return proxy;
  }

  function createObjectProxy<T extends object>(target: T, next: Tracked[]): T {
    const reads = objectHandler(target, next, () => proxy);
    const proxy: T = new Proxy(target, {
      get(t, prop) {
        if (typeof prop === 'string' && !canSubstitute(t, prop)) {
          return Reflect.get(t, prop, t);
        }
        return reads.get(prop);
      },
      // Setters run against the real target too (`#private`, host setters).
      set(t, prop, value) {
        return Reflect.set(t, prop, value, t);
      },
    });
    views.add(proxy);
    return proxy;
  }

  /** Property reads of an object view; `self` is the view handed out. */
  function objectHandler(
    target: object,
    next: Tracked[],
    self: () => object,
  ): { get(prop: string | symbol): unknown } {
    const memo = new Map<string, { value: unknown; out: unknown }>();
    return {
      get(prop) {
        const value: unknown = Reflect.get(target, prop, target);
        if (typeof prop !== 'string') return value;
        if (!isCallable(value) && !isNavigable(value)) return value;
        if (isView(value)) return value;

        const cachedProp = memo.get(prop);
        if (cachedProp && cachedProp.value === value) return cachedProp.out;

        const { leafs, deeper } = select(next, prop);
        const observed = leafs.length > 0 || deeper.length > 0;
        // Unobserved methods of a class instance or host object are wrapped
        // only to run against the real target (`#private` fields and native
        // brand checks need it); on plain data they pass through as is.
        if (!observed && (!isCallable(value) || isPlainData(target))) {
          return value;
        }

        let out: unknown = value;
        if (isCallable(value)) {
          out = wrapFunction(value, leafs, deeper, { proxy: self(), target });
        } else if (deeper.length > 0) {
          out = wrapObject(value, deeper);
        }
        memo.set(prop, { value, out });
        return out;
      },
    };
  }

  function wrapFunction(
    target: Callable,
    leafs: string[],
    next: Tracked[],
    parent?: { proxy: object; target: object },
  ): Callable {
    // Deeper segments that are properties of the function (statics) are
    // navigated by `get`; the rest continue on the call result.
    const onResult = (): Tracked[] =>
      next.filter((t) => !hasStatic(target, t.rest[0]));

    const memo = new Map<string, { value: unknown; out: unknown }>();
    const proxy: Callable = new Proxy(target, {
      get(t, prop) {
        const value: unknown = Reflect.get(t, prop, t);
        if (typeof prop !== 'string' || !canSubstitute(t, prop)) return value;
        if (!hasStatic(t, prop)) return value;
        const { leafs: propLeafs, deeper } = select(next, prop);
        if (propLeafs.length === 0 && deeper.length === 0) return value;
        if (isView(value)) return value;

        const cachedProp = memo.get(prop);
        if (cachedProp && cachedProp.value === value) return cachedProp.out;
        let out: unknown = value;
        if (isCallable(value)) {
          out = wrapFunction(value, propLeafs, deeper, { proxy, target: t });
        } else if (isNavigable(value) && deeper.length > 0) {
          out = wrapObject(value, deeper);
        }
        memo.set(prop, { value, out });
        return out;
      },
      set(t, prop, value) {
        return Reflect.set(t, prop, value, t);
      },
      apply(t, thisArg: unknown, args: unknown[]) {
        recordCall(leafs, args);
        const self =
          parent && (thisArg === parent.proxy || thisArg === undefined)
            ? parent.target
            : thisArg;
        const result: unknown = Reflect.apply(t, self, args);
        return navigate(result, onResult());
      },
      construct(t, args: unknown[], newTarget) {
        recordCall(leafs, args);
        const result: object = Reflect.construct(
          t,
          args,
          newTarget === proxy ? t : newTarget,
        );
        const out = navigate(result, onResult());
        return isNavigable(out) || isCallable(out) ? out : result;
      },
    });
    views.add(proxy);
    return proxy;
  }

  return { env: createObjectProxy(env, tracked), calls, unresolved };
}
