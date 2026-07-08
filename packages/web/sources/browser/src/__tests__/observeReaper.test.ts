import type { Elb } from '@walkeros/core';
import type { Settings, InitScope } from '../types';
import {
  registerScanElement,
  handleRemovedNode,
  isRegistered,
  resetScope,
  destroyTriggers,
} from '../trigger';
import { initVisibilityTracking } from '../triggerVisible';

// Unit tests for the reaper the MutationObserver's removed-node path calls. It is
// exercised directly here (no observer), proving: a removed element's timers stop,
// its visibility observation is released, its tagged descendants are reaped too,
// and — crucially — reaping honors the OWNING scope (Amendment 2), so an element
// owned by the document scope but removed via a sub-scope context is released from
// the document bucket, never stranded.

const createTestSettings = (
  prefix = 'data-elb',
  scope: Settings['scope'] = document,
): Settings => ({
  prefix,
  scope,
  pageview: false,
  elb: '',
  elbLayer: false,
});

// Captures the single per-document IntersectionObserver so the visible-element
// path can assert `unobserve` without a cast. Cast-free via `implements`.
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

describe('handleRemovedNode (reaper)', () => {
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    lastObserver = undefined;
    mockElb = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    destroyTriggers();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  test('reaps a removed pulse element: clears its interval and stops firing', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const scope = document.createElement('div');
    document.body.appendChild(scope);
    const bucket = resetScope(scope);
    const context = {
      elb: mockElb,
      settings: createTestSettings('data-elb', scope),
    };

    const pulse = document.createElement('div');
    pulse.setAttribute('data-elb', 'c');
    pulse.setAttribute('data-elbaction', 'pulse(1000):a');
    scope.appendChild(pulse);

    const registration = registerScanElement(
      context,
      pulse,
      'data-elbaction',
      bucket,
      scope,
    );
    expect(registration?.intervalIds).toHaveLength(1);
    const intervalId = registration?.intervalIds[0];

    jest.advanceTimersByTime(1000);
    const firesWhileAttached = mockElb.mock.calls.length;
    expect(firesWhileAttached).toBeGreaterThan(0);

    handleRemovedNode(context, pulse);

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
    expect(isRegistered(pulse)).toBe(false);
    expect(bucket.registered.has(pulse)).toBe(false);

    // No phantom fire on the detached node after advancing well past the period.
    jest.advanceTimersByTime(5000);
    expect(mockElb.mock.calls.length).toBe(firesWhileAttached);
  });

  test('reaps a removed visible element: unobserves it from the shared observer', () => {
    const originalIO = global.IntersectionObserver;
    global.IntersectionObserver = MockIntersectionObserver;

    try {
      const scope = document.createElement('div');
      document.body.appendChild(scope);
      initVisibilityTracking(scope, 1000);
      const bucket = resetScope(scope);
      const context = {
        elb: mockElb,
        settings: createTestSettings('data-elb', scope),
      };

      const visible = document.createElement('div');
      visible.setAttribute('data-elb', 'c');
      visible.setAttribute('data-elbaction', 'visible:a');
      scope.appendChild(visible);

      const registration = registerScanElement(
        context,
        visible,
        'data-elbaction',
        bucket,
        scope,
      );
      expect(registration?.observed).toBe(true);
      expect(bucket.observed.has(visible)).toBe(true);

      handleRemovedNode(context, visible);

      expect(lastObserver?.unobserve).toHaveBeenCalledWith(visible);
      expect(bucket.observed.has(visible)).toBe(false);
      expect(isRegistered(visible)).toBe(false);
    } finally {
      global.IntersectionObserver = originalIO;
    }
  });

  test('removing a wrapper reaps its tagged descendants', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const scope = document.createElement('div');
    document.body.appendChild(scope);
    const bucket = resetScope(scope);
    const context = {
      elb: mockElb,
      settings: createTestSettings('data-elb', scope),
    };

    // Wrapper itself is untagged; its descendant carries the action.
    const wrapper = document.createElement('div');
    const child = document.createElement('div');
    child.setAttribute('data-elb', 'c');
    child.setAttribute('data-elbaction', 'pulse(1000):a');
    wrapper.appendChild(child);
    scope.appendChild(wrapper);

    const registration = registerScanElement(
      context,
      child,
      'data-elbaction',
      bucket,
      scope,
    );
    expect(isRegistered(child)).toBe(true);
    const intervalId = registration?.intervalIds[0];

    handleRemovedNode(context, wrapper);

    expect(isRegistered(child)).toBe(false);
    expect(bucket.registered.has(child)).toBe(false);
    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
  });

  test('reaps from the OWNING (document) scope when removed via a sub-scope context (Amendment 2)', () => {
    const originalIO = global.IntersectionObserver;
    global.IntersectionObserver = MockIntersectionObserver;

    try {
      // The document scope owns the element (registered pulse + scroll + visible).
      initVisibilityTracking(document, 1000);
      const docScope: InitScope = document;
      const docBucket = resetScope(docScope);
      const docContext = {
        elb: mockElb,
        settings: createTestSettings('data-elb', document),
      };

      const el = document.createElement('div');
      el.setAttribute('data-elb', 'c');
      el.setAttribute('data-elbaction', 'pulse(1000):a;scroll(50):s;visible:v');
      document.body.appendChild(el);

      registerScanElement(
        docContext,
        el,
        'data-elbaction',
        docBucket,
        docScope,
      );
      expect(docBucket.registered.has(el)).toBe(true);
      expect(docBucket.scrollElements.some(([e]) => e === el)).toBe(true);
      expect(docBucket.observed.has(el)).toBe(true);

      // A DIFFERENT sub-scope drives the removal (as a sub-scope observer would).
      const subScope = document.createElement('section');
      document.body.appendChild(subScope);
      resetScope(subScope);
      const subContext = {
        elb: mockElb,
        settings: createTestSettings('data-elb', subScope),
      };

      handleRemovedNode(subContext, el);

      // Released from the DOCUMENT bucket (its true owner), not stranded there.
      expect(docBucket.registered.has(el)).toBe(false);
      expect(docBucket.scrollElements.some(([e]) => e === el)).toBe(false);
      expect(docBucket.observed.has(el)).toBe(false);
      expect(isRegistered(el)).toBe(false);
    } finally {
      global.IntersectionObserver = originalIO;
    }
  });

  test('reaps ALL scroll entries for a multi-scroll element (no stale tuple)', () => {
    const scope = document.createElement('div');
    document.body.appendChild(scope);
    const bucket = resetScope(scope);
    const context = {
      elb: mockElb,
      settings: createTestSettings('data-elb', scope),
    };

    // Two scroll triggers on one element push two [elem, depth] tuples.
    const el = document.createElement('div');
    el.setAttribute('data-elb', 'c');
    el.setAttribute('data-elbaction', 'scroll(50):s;scroll(75):t');
    scope.appendChild(el);

    registerScanElement(context, el, 'data-elbaction', bucket, scope);
    expect(bucket.scrollElements.filter(([e]) => e === el)).toHaveLength(2);

    handleRemovedNode(context, el);

    // Both tuples must be gone; a leftover fires a phantom scroll on the
    // detached element when the scroll listener next runs.
    expect(bucket.scrollElements.filter(([e]) => e === el)).toHaveLength(0);
    expect(isRegistered(el)).toBe(false);
  });
});
