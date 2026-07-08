import type { InitScope } from '../types';
import {
  registerElement,
  isRegistered,
  reapElement,
  resetScope,
  destroyTriggers,
} from '../trigger';
import type { ElementRegistration } from '../trigger';

// Unit tests for the source-wide dedup registry and the single-element reap
// primitive, in isolation from any MutationObserver or scan wiring. Proves the
// two load-bearing guarantees before anything depends on them: (a) the registry
// prevents double-registration across scopes, and (b) reset/reap un-registers so
// a re-added element can register again (and its per-element hover listener is
// released).

// A fresh registration with the empty defaults registerScanElement builds,
// overridable per test.
const makeRegistration = (
  scope: InitScope,
  overrides: Partial<ElementRegistration> = {},
): ElementRegistration => ({
  scope,
  intervalIds: [],
  timeoutIds: [],
  scroll: false,
  observed: false,
  ...overrides,
});

describe('observe registry', () => {
  afterEach(() => {
    destroyTriggers();
  });

  test('registerElement adds to the registry; a second call is a no-op', () => {
    const scope = document.createElement('div');
    const bucket = resetScope(scope);
    const el = document.createElement('div');

    const first = registerElement(scope, el, makeRegistration(scope));

    expect(first).toBe(true);
    expect(isRegistered(el)).toBe(true);
    expect(bucket.registered.has(el)).toBe(true);

    const second = registerElement(scope, el, makeRegistration(scope));

    expect(second).toBe(false);
  });

  test('registerElement is a no-op when the scope has no live bucket', () => {
    // A scope never passed through resetScope has no entry in scopeStates, so
    // there is no bucket to register into — the derive-internally guard rejects.
    const scope = document.createElement('div');
    const el = document.createElement('div');

    expect(registerElement(scope, el, makeRegistration(scope))).toBe(false);
    expect(isRegistered(el)).toBe(false);
  });

  test('isRegistered is source-wide: a scope-B query sees a scope-A registration', () => {
    const scopeA = document.createElement('div');
    resetScope(scopeA);
    const scopeB = document.createElement('div');
    const bucketB = resetScope(scopeB);
    const el = document.createElement('div');

    registerElement(scopeA, el, makeRegistration(scopeA));

    // Queried "from" scope B, the element is still seen as registered.
    expect(isRegistered(el)).toBe(true);

    // A scope-B attempt to register the same element is rejected and does not
    // land it in scope B's set (no cross-scope double-registration).
    const claimed = registerElement(scopeB, el, makeRegistration(scopeB));
    expect(claimed).toBe(false);
    expect(bucketB.registered.has(el)).toBe(false);
  });

  test('reapElement clears + splices ids, aborts hover, un-registers, and allows re-registration', () => {
    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const scope = document.createElement('div');
    const bucket = resetScope(scope);
    const el = document.createElement('div');

    const intervalId = setInterval(() => undefined, 1000);
    const timeoutId = setTimeout(() => undefined, 1000);
    const hoverAbort = new AbortController();
    const abortSpy = jest.spyOn(hoverAbort, 'abort');

    // Mirror what the registration path records: ids in BOTH the flat bucket
    // arrays and the per-element registration, the element in bucket.observed
    // and bucket.scrollElements.
    bucket.intervalIds.push(intervalId);
    bucket.timeoutIds.push(timeoutId);
    bucket.observed.add(el);
    bucket.scrollElements.push([el, 50]);

    registerElement(
      scope,
      el,
      makeRegistration(scope, {
        intervalIds: [intervalId],
        timeoutIds: [timeoutId],
        hoverAbort,
        scroll: true,
        observed: true,
      }),
    );

    reapElement(el);

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    expect(abortSpy).toHaveBeenCalled();

    // Spliced out of the flat bucket arrays, not merely cleared.
    expect(bucket.intervalIds).not.toContain(intervalId);
    expect(bucket.timeoutIds).not.toContain(timeoutId);
    expect(bucket.scrollElements.some(([e]) => e === el)).toBe(false);
    expect(bucket.observed.has(el)).toBe(false);
    expect(bucket.registered.has(el)).toBe(false);

    // Un-registered, so the same element can register again.
    expect(isRegistered(el)).toBe(false);
    expect(registerElement(scope, el, makeRegistration(scope))).toBe(true);

    jest.useRealTimers();
  });

  test('reapElement of an unregistered element is a no-op', () => {
    const el = document.createElement('div');
    expect(() => reapElement(el)).not.toThrow();
    expect(isRegistered(el)).toBe(false);
  });

  test('resetScope un-registers every element and aborts each hover listener', () => {
    const scope = document.createElement('div');
    resetScope(scope);

    const first = document.createElement('div');
    const second = document.createElement('div');
    const abortFirst = new AbortController();
    const abortSecond = new AbortController();
    const abortFirstSpy = jest.spyOn(abortFirst, 'abort');
    const abortSecondSpy = jest.spyOn(abortSecond, 'abort');

    registerElement(
      scope,
      first,
      makeRegistration(scope, { hoverAbort: abortFirst }),
    );
    registerElement(
      scope,
      second,
      makeRegistration(scope, { hoverAbort: abortSecond }),
    );

    expect(isRegistered(first)).toBe(true);
    expect(isRegistered(second)).toBe(true);

    resetScope(scope);

    // Un-registration on reset: both are gone from the registry so a re-scan can
    // register them again (the sharpest trap the review flagged).
    expect(isRegistered(first)).toBe(false);
    expect(isRegistered(second)).toBe(false);

    // Amendment 1: hover now lives on per-element controllers, so reset must
    // abort each element's hoverAbort (bucket.abort no longer covers hover).
    expect(abortFirstSpy).toHaveBeenCalled();
    expect(abortSecondSpy).toHaveBeenCalled();
  });
});
