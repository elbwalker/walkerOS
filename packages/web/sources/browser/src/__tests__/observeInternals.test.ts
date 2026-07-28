import type { Elb } from '@walkeros/core';
import type {
  Context,
  ElementRegistration,
  InitScope,
  Registry,
  Settings,
} from '../types';
import {
  createRegistry,
  destroyTriggers,
  getScopeState,
  handleRemovedNode,
  initScopeTrigger,
  isRegistered,
  reapElement,
  registerElement,
  registerScanElement,
  resetScope,
} from '../trigger';
import { initVisibilityTracking } from '../triggerVisible';

// Internal-level cover for the pieces the [data-elbobserve] pipeline is built
// from: the per-source element registry, the single-element reaper, the scan
// that fills a registration, and the MutationObserver wiring. Behavior through
// a real collector lives in observeIntegration; what stays here is the set of
// invariants that suite cannot see, either because dedup masks them (observer
// counts) or because they are about which bucket owns what.
//
// jsdom delivers MutationObserver records on a microtask, so every assertion
// after an append or remove drains first.

const createTestSettings = (
  prefix = 'data-elb',
  scope: Settings['scope'] = document,
): Settings => ({
  prefix,
  scope,
  pageview: false,
  capture: true,
  elb: false,
  elbLayer: false,
});

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const tagged = (action: string, entity = 'p'): HTMLDivElement => {
  const el = document.createElement('div');
  el.setAttribute('data-elb', entity);
  el.setAttribute('data-elbaction', action);
  return el;
};

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

// Cast-free IntersectionObserver stub. `implements` keeps it assignable to
// `typeof IntersectionObserver` without a cast.
let lastObserver: MockIntersectionObserver | undefined;
class MockIntersectionObserver implements IntersectionObserver {
  root: Document | Element | null = null;
  rootMargin = '0px';
  thresholds: ReadonlyArray<number> = [0, 0.5];
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);
  constructor(_callback?: IntersectionObserverCallback) {
    lastObserver = this;
  }
}

describe('observe internals', () => {
  let mockElb: jest.MockedFunction<Elb.Fn>;
  let registry: Registry;
  let context: Context;

  // Scope-aligned context off the same registry, exactly as the translation
  // layer builds for `walker init <el>`.
  const scoped = (scope: InitScope): Context => ({
    ...context,
    settings: { ...context.settings, scope },
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    lastObserver = undefined;
    mockElb = jest.fn().mockResolvedValue({ ok: true });
    registry = createRegistry();
    context = { elb: mockElb, settings: createTestSettings(), registry };
  });

  afterEach(() => {
    destroyTriggers(context);
    document.body.innerHTML = '';
  });

  describe('element registry', () => {
    test('registerElement adds to the registry; a second call is a no-op', () => {
      const scope = document.createElement('div');
      const bucket = resetScope(registry, scope);
      const el = document.createElement('div');

      const first = registerElement(
        registry,
        scope,
        el,
        makeRegistration(scope),
      );

      expect(first).toBe(true);
      expect(isRegistered(registry, el)).toBe(true);
      expect(bucket.registered.has(el)).toBe(true);

      const second = registerElement(
        registry,
        scope,
        el,
        makeRegistration(scope),
      );

      expect(second).toBe(false);
    });

    test('registerElement is a no-op when the scope has no live bucket', () => {
      // A scope never passed through resetScope has no bucket to register into,
      // so the derive-internally guard rejects. Without it the element would
      // land in the registry with no bucket to ever release it.
      const scope = document.createElement('div');
      const el = document.createElement('div');

      expect(
        registerElement(registry, scope, el, makeRegistration(scope)),
      ).toBe(false);
      expect(isRegistered(registry, el)).toBe(false);
    });

    test('isRegistered is per registry: one source dedups across its scopes, two sources do not', () => {
      const other = createRegistry();
      const scopeA = document.createElement('div');
      resetScope(registry, scopeA);
      const scopeB = document.createElement('div');
      const bucketB = resetScope(registry, scopeB);
      const otherScope = document.createElement('div');
      const otherBucket = resetScope(other, otherScope);
      const el = document.createElement('div');

      registerElement(registry, scopeA, el, makeRegistration(scopeA));

      // Within one registry the element is seen as taken from any scope, and a
      // second scope's claim is rejected: no intra-source double-wiring.
      expect(isRegistered(registry, el)).toBe(true);
      expect(
        registerElement(registry, scopeB, el, makeRegistration(scopeB)),
      ).toBe(false);
      expect(bucketB.registered.has(el)).toBe(false);

      // A second source sees a free element and wires it into its own pipeline.
      expect(isRegistered(other, el)).toBe(false);
      expect(
        registerElement(other, otherScope, el, makeRegistration(otherScope)),
      ).toBe(true);
      expect(otherBucket.registered.has(el)).toBe(true);

      // Neither registry's record disturbed the other's.
      expect(isRegistered(registry, el)).toBe(true);

      destroyTriggers({ ...context, registry: other });
    });

    test('reapElement clears + splices ids, aborts hover, un-registers, and allows re-registration', () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const scope = document.createElement('div');
      const bucket = resetScope(registry, scope);
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
        registry,
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

      reapElement(registry, el);

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
      expect(isRegistered(registry, el)).toBe(false);
      expect(
        registerElement(registry, scope, el, makeRegistration(scope)),
      ).toBe(true);

      jest.useRealTimers();
    });

    test('resetScope un-registers every element and aborts each hover listener', () => {
      const scope = document.createElement('div');
      resetScope(registry, scope);

      const first = document.createElement('div');
      const second = document.createElement('div');
      const abortFirst = new AbortController();
      const abortSecond = new AbortController();
      const abortFirstSpy = jest.spyOn(abortFirst, 'abort');
      const abortSecondSpy = jest.spyOn(abortSecond, 'abort');

      registerElement(
        registry,
        scope,
        first,
        makeRegistration(scope, { hoverAbort: abortFirst }),
      );
      registerElement(
        registry,
        scope,
        second,
        makeRegistration(scope, { hoverAbort: abortSecond }),
      );

      resetScope(registry, scope);

      // Un-registration on reset: both are gone from the registry so a re-scan
      // can register them again.
      expect(isRegistered(registry, first)).toBe(false);
      expect(isRegistered(registry, second)).toBe(false);

      // Hover lives on per-element controllers, so reset must abort each one:
      // bucket.abort does not cover them.
      expect(abortFirstSpy).toHaveBeenCalled();
      expect(abortSecondSpy).toHaveBeenCalled();
    });
  });

  describe('scan', () => {
    test('records pulse/wait/scroll/hover resources into the registration', () => {
      jest.useFakeTimers();
      const scope = document.createElement('div');
      document.body.appendChild(scope);
      const bucket = resetScope(registry, scope);
      scope.innerHTML = `
        <div id="multi" data-elb="c"
             data-elbaction="pulse(1000):a;wait(2000):b;scroll(50):c;hover:d"></div>
      `;
      const multi = document.getElementById('multi')!;

      const registration = registerScanElement(
        scoped(scope),
        multi,
        'data-elbaction',
        bucket,
        scope,
      );

      // The registration is the reaper's only input: anything missing here
      // outlives the element's removal.
      expect(registration?.intervalIds).toHaveLength(1);
      expect(registration?.timeoutIds).toHaveLength(1);
      expect(registration?.scroll).toBe(true);
      expect(registration?.hoverAbort).toBeInstanceOf(AbortController);
      expect(isRegistered(registry, multi)).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('reaper', () => {
    test('removing a wrapper reaps its tagged descendants', () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const scope = document.createElement('div');
      document.body.appendChild(scope);
      const bucket = resetScope(registry, scope);
      const scopeContext = scoped(scope);

      // Wrapper itself is untagged; its descendant carries the action.
      const wrapper = document.createElement('div');
      const child = tagged('pulse(1000):a', 'c');
      wrapper.appendChild(child);
      scope.appendChild(wrapper);

      const registration = registerScanElement(
        scopeContext,
        child,
        'data-elbaction',
        bucket,
        scope,
      );
      expect(isRegistered(registry, child)).toBe(true);
      const intervalId = registration?.intervalIds[0];

      handleRemovedNode(scopeContext, wrapper);

      expect(isRegistered(registry, child)).toBe(false);
      expect(bucket.registered.has(child)).toBe(false);
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);

      jest.useRealTimers();
    });

    test('reaps from the OWNING scope when removed via a sub-scope context', () => {
      jest.useFakeTimers();
      const originalIO = global.IntersectionObserver;
      global.IntersectionObserver = MockIntersectionObserver;

      try {
        // The document scope owns the element (pulse + scroll + visible).
        initVisibilityTracking(registry, document, 1000);
        const docBucket = resetScope(registry, document);

        const el = tagged('pulse(1000):a;scroll(50):s;visible:v', 'c');
        document.body.appendChild(el);

        registerScanElement(context, el, 'data-elbaction', docBucket, document);
        expect(docBucket.registered.has(el)).toBe(true);
        expect(docBucket.scrollElements.some(([e]) => e === el)).toBe(true);
        expect(docBucket.observed.has(el)).toBe(true);

        // A DIFFERENT sub-scope drives the removal, as a sub-scope observer
        // would. The reaper must still release from the true owner.
        const subScope = document.createElement('section');
        document.body.appendChild(subScope);
        resetScope(registry, subScope);

        handleRemovedNode(scoped(subScope), el);

        expect(docBucket.registered.has(el)).toBe(false);
        expect(docBucket.scrollElements.some(([e]) => e === el)).toBe(false);
        expect(docBucket.observed.has(el)).toBe(false);
        expect(lastObserver?.unobserve).toHaveBeenCalledWith(el);
        expect(isRegistered(registry, el)).toBe(false);
      } finally {
        global.IntersectionObserver = originalIO;
        jest.useRealTimers();
      }
    });

    test('reaps ALL scroll entries for a multi-scroll element (no stale tuple)', () => {
      const scope = document.createElement('div');
      document.body.appendChild(scope);
      const bucket = resetScope(registry, scope);
      const scopeContext = scoped(scope);

      // Two scroll triggers on one element push two [elem, depth] tuples.
      const el = tagged('scroll(50):s;scroll(75):t', 'c');
      scope.appendChild(el);

      registerScanElement(scopeContext, el, 'data-elbaction', bucket, scope);
      expect(bucket.scrollElements.filter(([e]) => e === el)).toHaveLength(2);

      handleRemovedNode(scopeContext, el);

      // Both tuples must be gone; a leftover fires a phantom scroll on the
      // detached element when the scroll listener next runs.
      expect(bucket.scrollElements.filter(([e]) => e === el)).toHaveLength(0);
      expect(isRegistered(registry, el)).toBe(false);
    });
  });

  describe('observe container wiring', () => {
    test('registers a deep descendant when a subtree is injected (addedNodes holds only the top node)', async () => {
      document.body.innerHTML = `<div id="box" data-elbobserve></div>`;
      const box = document.getElementById('box')!;

      initScopeTrigger(context);

      const wrapper = document.createElement('section');
      wrapper.innerHTML = `<span><b id="deep" data-elb="p" data-elbaction="load:view"></b></span>`;
      box.appendChild(wrapper);
      await flush();

      const deep = document.getElementById('deep')!;
      expect(isRegistered(registry, deep)).toBe(true);
      expect(mockElb).toHaveBeenCalledTimes(1);
    });

    test('a nested observe container gets no own observer', async () => {
      document.body.innerHTML = `
        <div id="outer" data-elbobserve>
          <div id="inner" data-elbobserve></div>
        </div>
      `;
      const inner = document.getElementById('inner')!;

      initScopeTrigger(context);

      // Observer COUNT is the load-bearing assertion: the registry makes a
      // stray second observer's re-registration a no-op, so event counts alone
      // cannot distinguish the nesting-skip from a double-observer regression.
      expect(getScopeState(registry, document)?.mutationObservers).toHaveLength(
        1,
      );

      inner.appendChild(tagged('load:view'));
      await flush();

      expect(mockElb).toHaveBeenCalledTimes(1);
    });

    test('two sibling observe containers each get their own observer', async () => {
      document.body.innerHTML = `
        <div id="a" data-elbobserve></div>
        <div id="b" data-elbobserve></div>
      `;
      const a = document.getElementById('a')!;
      const b = document.getElementById('b')!;

      initScopeTrigger(context);
      expect(getScopeState(registry, document)?.mutationObservers).toHaveLength(
        2,
      );

      const first = tagged('load:view');
      a.appendChild(first);
      const second = tagged('load:view');
      b.appendChild(second);
      await flush();

      expect(isRegistered(registry, first)).toBe(true);
      expect(isRegistered(registry, second)).toBe(true);
      expect(mockElb).toHaveBeenCalledTimes(2);
    });

    test('injecting a text node into an observed container does not throw and registers nothing', async () => {
      document.body.innerHTML = `<div id="box" data-elbobserve></div>`;
      const box = document.getElementById('box')!;

      initScopeTrigger(context);

      // A throw inside the observer callback would kill every later mutation
      // for this container.
      box.appendChild(document.createTextNode('word-by-word chat stream'));
      await flush();

      expect(mockElb).not.toHaveBeenCalled();
    });

    test('a walker init <el> sub-scope whose element itself carries data-elbobserve is observed', async () => {
      document.body.innerHTML = `<section id="sub" data-elbobserve></section>`;
      const sub = document.getElementById('sub')!;

      initScopeTrigger(scoped(sub));
      expect(getScopeState(registry, sub)?.mutationObservers).toHaveLength(1);

      const injected = tagged('load:view');
      sub.appendChild(injected);
      await flush();

      expect(isRegistered(registry, injected)).toBe(true);
      expect(mockElb).toHaveBeenCalledTimes(1);
    });

    test('a second walker init on the same scope disconnects the old observers before attaching fresh ones', () => {
      document.body.innerHTML = `<div id="box" data-elbobserve></div>`;

      initScopeTrigger(context);
      const firstObservers = [
        ...(getScopeState(registry, document)?.mutationObservers ?? []),
      ];
      expect(firstObservers).toHaveLength(1);
      const disconnectSpy = jest.spyOn(firstObservers[0]!, 'disconnect');

      initScopeTrigger(context);

      // Stacked observers are invisible in event counts (dedup absorbs the
      // duplicate add) but grow without bound on an SPA that runs `walker run`
      // per route change.
      expect(disconnectSpy).toHaveBeenCalled();
      const secondObservers =
        getScopeState(registry, document)?.mutationObservers ?? [];
      expect(secondObservers).toHaveLength(1);
      expect(secondObservers[0]).not.toBe(firstObservers[0]);
    });

    test('a shadow-hosted container and a light-DOM container each keep their own observer and observe strictly separate trees', async () => {
      // The light-DOM container wraps the shadow host. Node.contains does not
      // cross the shadow boundary, so `outer.contains(shadowBox)` is false and
      // the nesting-skip keeps BOTH containers: two observers, one per tree.
      document.body.innerHTML = `<div id="outer" data-elbobserve><div id="host"></div></div>`;
      const outer = document.getElementById('outer')!;
      const host = document.getElementById('host')!;
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = `<div id="shadowBox" data-elbobserve></div>`;
      const shadowBox = root.getElementById('shadowBox')!;

      initScopeTrigger(context);

      expect(getScopeState(registry, document)?.mutationObservers).toHaveLength(
        2,
      );

      // Injecting into the shadow tree fires exactly once: only the shadow
      // observer sees it. A light observer reporting it too would make this 2.
      const inShadow = tagged('load:view');
      shadowBox.appendChild(inShadow);
      await flush();

      expect(isRegistered(registry, inShadow)).toBe(true);
      expect(mockElb).toHaveBeenCalledTimes(1);

      // Injecting into the light tree fires exactly once more.
      const inLight = tagged('load:view');
      outer.appendChild(inLight);
      await flush();

      expect(isRegistered(registry, inLight)).toBe(true);
      expect(mockElb).toHaveBeenCalledTimes(2);

      // The shadow observer reaps its own removals.
      shadowBox.removeChild(inShadow);
      await flush();

      expect(isRegistered(registry, inShadow)).toBe(false);
    });
  });
});
