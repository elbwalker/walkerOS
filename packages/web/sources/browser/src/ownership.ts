import { isObject, tryCatch } from '@walkeros/core';
import type { Registry } from './types';

/**
 * Ownership marks for the two single-slot resources a source cannot keep on
 * its instance: the named `elbLayer` array and the `window.elb` writer. The
 * mark's value is the owning source's Registry, never a boolean, so a source
 * recognises its own resource and only a foreign owner is a conflict.
 *
 * `Symbol.for` resolves through the agent-wide symbol registry, so the key is
 * the same across separately bundled copies of this package and across
 * same-origin frames, which is exactly where two sources meet.
 */
const OWNER = Symbol.for('@walkeros/web-source-browser:owner');

// Objects and functions can carry a mark; both `window.elb` (a function) and
// the layer (an array) do.
const isMarkable = (value: unknown): value is object =>
  value !== null && (typeof value === 'object' || typeof value === 'function');

// Keyed map or weak map, probed by capability rather than `instanceof`: a
// same-origin frame's Map is not this realm's Map, and the mark is meant to be
// read across exactly that boundary.
const isKeyed = (value: unknown): boolean =>
  isMarkable(value) &&
  typeof Reflect.get(value, 'get') === 'function' &&
  typeof Reflect.get(value, 'set') === 'function' &&
  typeof Reflect.get(value, 'has') === 'function';

// The mark is read off a page-owned value, so narrow it by shape rather than
// trusting the key. The check probes the two containers every registry carries
// and stays there on purpose: only identity against a live registry is ever
// acted on, and a stricter shape would read a copy of this package from a
// different version as unowned and let both sources take the same resource.
const isRegistry = (value: unknown): value is Registry =>
  isObject(value) && isKeyed(value.scopes) && isKeyed(value.elements);

/**
 * Mark a value as owned by `registry`. Only ever call this on a value this
 * source created or is adopting as a whole: marking a value read off a page
 * object (an inherited `Array.prototype.push`, say) would claim it for every
 * user of that prototype.
 *
 * A frozen or sealed target rejects the definition. That failure is silent and
 * leaves the value unmarked, which reads as free: an unwritable node must cost
 * the source its lock, never its scan, and an escaping throw would surface in
 * the collector's init.
 */
export function mark<T extends object>(value: T, registry: Registry): T {
  tryCatch(() => {
    Object.defineProperty(value, OWNER, {
      value: registry,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  })();
  return value;
}

/** The registry owning `value`, or undefined when it is unmarked. */
export function owner(value: unknown): Registry | undefined {
  if (!isMarkable(value)) return undefined;
  const found: unknown = Reflect.get(value, OWNER);
  return isRegistry(found) ? found : undefined;
}

/**
 * Hand a resource back, so the next source takes it cleanly. Call only for a
 * value this source owns. `Reflect.deleteProperty` reports a non-configurable
 * target with `false` rather than throwing, so no guard is needed.
 */
export function release(value: object): void {
  Reflect.deleteProperty(value, OWNER);
}
