import type { Simulation } from '@walkeros/core';

/** Depth beyond which sanitizeArgs stops descending and emits a marker. */
const SANITIZE_MAX_DEPTH = 6;

/**
 * True only for plain objects (prototype is Object.prototype or null). DOM
 * nodes, class instances, Dates, Errors, etc. are non-plain and get tagged
 * rather than deep-copied.
 */
function isPlainObject(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Read one property without letting a hostile getter escape. Sanitization
 * runs inside the push try-block after a successful delivery, so a throwing
 * getter must degrade to a marker, never surface as a push failure.
 */
function readProp(source: Record<string, unknown>, key: string): unknown {
  try {
    return source[key];
  } catch {
    return '[unreadable]';
  }
}

/**
 * Stable string tag for a non-plain object (DOM node, class instance, ...).
 * Falls back to a generic marker if the value's own String() throws.
 */
function objectTag(value: object): string {
  try {
    return String(value);
  } catch {
    return '[object]';
  }
}

/**
 * Produce a JSON-safe deep copy of recorded vendor-call arguments. Vendor
 * calls can receive functions, DOM nodes, or cyclic structures that break or
 * silently vanish under the poster's JSON.stringify. Replace those leaves with
 * stable marker strings so the recorded calls always serialize:
 * functions -> '[function]', non-plain objects -> their String() tag, cyclic
 * refs -> '[circular]', anything past SANITIZE_MAX_DEPTH -> '[truncated]',
 * and values a throwing getter/hostile proxy makes unreadable -> '[unreadable]'.
 * Never throws: a sanitize failure must not alter push semantics.
 */
export function sanitizeArgs(args: unknown[]): unknown[] {
  const seen = new WeakSet<object>();

  const walk = (value: unknown, depth: number): unknown => {
    if (value === null) return null;
    if (typeof value === 'function') return '[function]';
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'bigint') return String(value);
    if (typeof value !== 'object') return undefined; // symbol/undefined: JSON-invisible

    const obj = value;
    if (seen.has(obj)) return '[circular]';
    if (depth >= SANITIZE_MAX_DEPTH) return '[truncated]';
    seen.add(obj);

    // Structurally hostile values (revoked proxies, throwing ownKeys traps)
    // must degrade to a marker: any throw here would surface inside the push
    // try-block and convert a successful delivery into a failure. Property
    // getters are additionally guarded per-value via readProp so one bad
    // getter only marks its own slot.
    let result: unknown;
    try {
      if (Array.isArray(obj)) {
        result = obj.map((item) => walk(item, depth + 1));
      } else if (isPlainObject(obj)) {
        const copy: Record<string, unknown> = {};
        for (const key of Object.keys(obj)) {
          copy[key] = walk(readProp(obj, key), depth + 1);
        }
        result = copy;
      } else {
        result = objectTag(obj);
      }
    } catch {
      result = '[unreadable]';
    }

    // Remove on exit so only ancestors (true cycles) count, not repeated
    // siblings referencing the same object.
    seen.delete(obj);
    return result;
  };

  return args.map((arg) => walk(arg, 0));
}

/**
 * Sanitize every recorded call's args into a JSON-safe projection. `fn` and
 * `ts` are already primitives; only `args` needs the deep pass.
 */
export function sanitizeCalls(calls: Simulation.Call[]): Simulation.Call[] {
  return calls.map((call) => ({
    fn: call.fn,
    args: sanitizeArgs(call.args),
    ts: call.ts,
  }));
}
