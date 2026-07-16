import type { Elb } from '@walkeros/core';
import type { Context } from '../types';
import {
  initVisibilityTracking,
  triggerVisible,
  destroyVisibilityTracking,
  unobserveElement,
} from '../triggerVisible';
import { resetSim, setBox, scrollTo, resizeElement } from './ioSimulator';

// Test utilities for scope-based visibility tracking

// Helper function to create test context
const createTestContext = (elb: Elb.Fn, prefix = 'data-elb'): Context => ({
  elb,
  settings: {
    prefix,
    scope: document,
    pageview: false,
    capture: true,
    elb: '',
    elbLayer: false,
  },
});

// A single `await Promise.resolve()` advances the microtask queue by exactly one
// tick. `Promise.all` plus fire()'s continuation need several, so a test that
// inspects state after one tick sees a write that has not landed yet - and then
// passes for the wrong reason. Drain properly.
const drainMicrotasks = async (): Promise<void> => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

// Mock isVisible
jest.mock('@walkeros/web-core', () => ({
  ...jest.requireActual('@walkeros/web-core'),
  isVisible: jest.fn(),
}));

// Mock handleTrigger
jest.mock('../trigger', () => ({
  ...jest.requireActual('../trigger'),
  handleTrigger: jest.fn(),
  Triggers: { Impression: 'impression', Visible: 'visible' },
}));

// Get references to mocked functions
const { isVisible } = require('@walkeros/web-core');
const { handleTrigger } = require('../trigger');

// A real IntersectionObserver subclass, installed over the simulator's, that
// records constructor options and observe/unobserve/disconnect calls while
// still delegating to the real (simulator) behaviour. Subclassing (rather than
// jest.spyOn) is required: spying on a class assigned to window.* breaks the
// `new` invocation the production code relies on.
interface ObserverSpy {
  constructorCalls: IntersectionObserverInit[];
  observedTargets: Element[];
  unobservedTargets: Element[];
  disconnectCount: number;
}

function spyOnIntersectionObserver(): ObserverSpy {
  const Real = window.IntersectionObserver;
  const spy: ObserverSpy = {
    constructorCalls: [],
    observedTargets: [],
    unobservedTargets: [],
    disconnectCount: 0,
  };

  class SpyIntersectionObserver extends Real {
    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      super(callback, options);
      spy.constructorCalls.push(
        options ?? { root: null, rootMargin: '', threshold: 0 },
      );
    }

    observe(target: Element): void {
      spy.observedTargets.push(target);
      super.observe(target);
    }

    unobserve(target: Element): void {
      spy.unobservedTargets.push(target);
      super.unobserve(target);
    }

    disconnect(): void {
      spy.disconnectCount += 1;
      super.disconnect();
    }
  }

  window.IntersectionObserver = SpyIntersectionObserver;
  return spy;
}

describe('triggerVisible', () => {
  let mockElb: jest.MockedFunction<Elb.Fn>;
  let testScope: Document;

  beforeEach(() => {
    jest.useFakeTimers();
    resetSim({ width: 1000, height: 450 });
    (isVisible as jest.Mock).mockReturnValue(true);
    (handleTrigger as jest.Mock).mockResolvedValue([]);

    mockElb = jest.fn().mockResolvedValue({
      ok: true,
    });

    testScope = document;
  });

  afterEach(() => {
    destroyVisibilityTracking(testScope);
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('initVisibilityTracking creates an IntersectionObserver with the dense threshold grid', () => {
    const spy = spyOnIntersectionObserver();

    initVisibilityTracking(testScope, 2000);

    expect(spy.constructorCalls).toEqual([
      {
        rootMargin: '0px',
        threshold: Array.from({ length: 101 }, (_, index) => index / 100),
      },
    ]);
  });

  test('initVisibilityTracking does not reinitialize if already initialized', async () => {
    initVisibilityTracking(testScope, 1000);

    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 0, left: 0, width: 300, height: 200 }); // fully visible

    triggerVisible(createTestContext(mockElb), element);

    // A second init call for the same scope must be a no-op: it must not
    // replace the state backing the element already registered above. If it
    // did, the armed timer's `fire()` would look up a fresh, empty state and
    // silently find no config for this element.
    initVisibilityTracking(testScope, 2000);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('triggerVisible observes the element via the shared per-document observer', () => {
    const spy = spyOnIntersectionObserver();
    initVisibilityTracking(testScope);

    const element = document.createElement('div');
    triggerVisible(createTestContext(mockElb), element, { multiple: true });

    expect(spy.observedTargets).toEqual([element]);
  });

  test('triggerVisible handles element without observer gracefully', () => {
    // Don't initialize visibility tracking
    const spy = spyOnIntersectionObserver();
    const element = document.createElement('div');

    expect(() => {
      const context = createTestContext(mockElb);
      triggerVisible(context, element);
    }).not.toThrow();

    expect(spy.observedTargets).toHaveLength(0);
  });

  test('a fully visible element fires impression after the dwell duration', async () => {
    initVisibilityTracking(testScope, 500);

    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 0, left: 0, width: 300, height: 200 }); // ratio 1

    triggerVisible(createTestContext(mockElb), element);

    jest.advanceTimersByTime(500);
    await Promise.resolve();

    expect(handleTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        elb: mockElb,
        settings: expect.objectContaining({
          prefix: 'data-elb',
          scope: expect.any(Object),
          pageview: false,
          elb: '',
          elbLayer: false,
        }),
      }),
      element,
      'impression',
    );
  });

  test('leaving the eligible band before the dwell expires cancels the trigger', async () => {
    initVisibilityTracking(testScope, 500);

    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 1000, left: 0, width: 300, height: 200 });

    triggerVisible(createTestContext(mockElb), element);

    scrollTo(900); // element top 100 => fully visible => eligible, dwell arms
    scrollTo(400); // element top 600 => below the viewport => dwell cancelled

    jest.advanceTimersByTime(500);
    await Promise.resolve();

    expect(handleTrigger).not.toHaveBeenCalled();
  });

  test('multiple triggers: blocks re-triggering while still in the eligible band', async () => {
    initVisibilityTracking(testScope, 100);

    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 0, left: 0, width: 300, height: 300 });

    triggerVisible(createTestContext(mockElb), element, { multiple: true });

    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(handleTrigger).toHaveBeenCalledTimes(1);

    // Still eligible (half the element remains on screen) but the ratio moved
    // enough to cross a threshold index and deliver a fresh entry. An
    // already-fired `multiple` config must stay blocked until the element
    // genuinely leaves the eligible band.
    scrollTo(150);
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('multiple triggers: allows re-triggering after leaving and re-entering the eligible band', async () => {
    initVisibilityTracking(testScope, 100);

    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 1000, left: 0, width: 300, height: 200 });

    triggerVisible(createTestContext(mockElb), element, { multiple: true });

    scrollTo(900); // fully visible -> eligible
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    expect(handleTrigger).toHaveBeenCalledTimes(1);

    scrollTo(400); // leaves the viewport -> blocked resets
    scrollTo(900); // comes back -> eligible again
    jest.advanceTimersByTime(100);
    await Promise.resolve();

    expect(handleTrigger).toHaveBeenCalledTimes(2);
  });

  test('unobserveElement unobserves the element and clears its armed timer', () => {
    const spy = spyOnIntersectionObserver();
    initVisibilityTracking(testScope, 1000);

    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 0, left: 0, width: 300, height: 200 }); // fully visible, timer arms

    triggerVisible(createTestContext(mockElb), element);

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    unobserveElement(testScope, element);

    expect(spy.unobservedTargets).toContain(element);
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  test('destroyVisibilityTracking disconnects the observer', () => {
    const spy = spyOnIntersectionObserver();
    initVisibilityTracking(testScope);

    destroyVisibilityTracking(testScope);

    expect(spy.disconnectCount).toBe(1);
  });

  test('handles missing IntersectionObserver gracefully', () => {
    // Remove the global without a cast: Object.defineProperty's own
    // PropertyDescriptor.value is typed `any` in lib.es5, so no cast is
    // introduced here.
    const original = window.IntersectionObserver;
    Object.defineProperty(window, 'IntersectionObserver', {
      value: undefined,
      configurable: true,
    });

    expect(() => {
      initVisibilityTracking(testScope);
    }).not.toThrow();

    Object.defineProperty(window, 'IntersectionObserver', {
      value: original,
      configurable: true,
    });
  });

  describe('Scope-aligned re-init', () => {
    const buildContext = (scope: Document | Element): Context => ({
      elb: mockElb,
      settings: {
        prefix: 'data-elb',
        scope,
        pageview: false,
        capture: true,
        elb: '',
        elbLayer: false,
      },
    });

    test('3a observes and fires a sub-scope element via the shared per-document observer', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const promo = document.createElement('div');
      container.appendChild(promo);
      setBox(promo, { top: 0, left: 0, width: 300, height: 200 }); // fully visible

      // Visibility initialized for the sub-scope (as `walker init <container>`).
      initVisibilityTracking(container, 500);

      // The element is registered through the scope carried by context. Today
      // initVisibilityTracking keys the observer by the container while
      // triggerVisible looks it up by context.settings.scope (document): the
      // keys diverge, the element is never observed, and it never fires.
      const context = buildContext(document);
      triggerVisible(context, promo, { multiple: true });

      jest.advanceTimersByTime(500);
      await Promise.resolve();

      expect(handleTrigger).toHaveBeenCalledWith(
        expect.objectContaining({ elb: mockElb }),
        promo,
        'visible',
      );

      destroyVisibilityTracking(container);
      destroyVisibilityTracking(document);
    });

    // Renamed from "re-registering the same element fires once on a single
    // intersection". Under the new array-based config (one element can carry
    // both `impression` and `visible`, per triggerVisible's design comment),
    // registering the SAME element twice deliberately accumulates configs so
    // both fire; that is what lets one element declare both trigger types.
    // What must still hold is the single-observe guard (`if (configs.length >
    // 1) return`), so this test now verifies that invariant directly, and
    // exercises it via the real dual-trigger scenario the guard exists for.
    test('3b one element carrying both impression and visible triggers observes once and fires both', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const promo = document.createElement('div');
      container.appendChild(promo);
      setBox(promo, { top: 0, left: 0, width: 300, height: 200 });

      const spy = spyOnIntersectionObserver();
      initVisibilityTracking(container, 500);

      const context = buildContext(container);
      triggerVisible(context, promo); // impression (single-shot)
      triggerVisible(context, promo, { multiple: true }); // visible (repeatable)

      expect(spy.observedTargets).toEqual([promo]); // observed exactly once

      jest.advanceTimersByTime(500);
      await Promise.resolve();

      expect(handleTrigger).toHaveBeenCalledTimes(2);
      expect(handleTrigger).toHaveBeenCalledWith(
        expect.objectContaining({ elb: mockElb }),
        promo,
        'impression',
      );
      expect(handleTrigger).toHaveBeenCalledWith(
        expect.objectContaining({ elb: mockElb }),
        promo,
        'visible',
      );

      destroyVisibilityTracking(container);
      destroyVisibilityTracking(document);
    });
  });

  test('a failed dwell does not wedge the element forever', async () => {
    // The element is eligible but genuinely hidden (a carousel slide covered in
    // place, a collapsed tab panel). The dwell expires, isVisible says no, nothing
    // fires. It is then revealed. It MUST still be able to fire.
    //
    // The element deliberately never leaves the eligible band: today's only escape
    // from a stranded timer is the ratio dropping below threshold, and that is
    // precisely the escape a real user does not take.
    //
    // Viewport is 1000x450, element is 300x200 at document top 1000.
    initVisibilityTracking(testScope, 1000);
    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 1000, left: 0, width: 300, height: 200 });

    (isVisible as jest.Mock).mockReturnValue(false);
    triggerVisible(createTestContext(mockElb), element, { multiple: true });

    // Element top at 300 => 150px of 200px showing => ratio 0.75 => eligible.
    scrollTo(700);
    jest.advanceTimersByTime(1500);
    await Promise.resolve();
    expect(handleTrigger).not.toHaveBeenCalled(); // dwell failed, as designed

    // Now it is genuinely visible. Move to a different threshold band so an entry
    // is delivered (ratio 0.75 -> 0.5), while STAYING eligible throughout.
    (isVisible as jest.Mock).mockReturnValue(true);
    scrollTo(650); // element top 350 => 100px showing => ratio 0.5 => still eligible

    jest.advanceTimersByTime(1500);
    await Promise.resolve();

    // Old behaviour: the stranded timer id makes `!existingTimer` false forever,
    // so no new dwell is ever armed and this is 0.
    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('does not fire in a background tab', async () => {
    initVisibilityTracking(testScope, 1000);
    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 100, left: 0, width: 300, height: 200 });

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    try {
      triggerVisible(createTestContext(mockElb), element);
      jest.advanceTimersByTime(1500);
      await Promise.resolve();

      expect(handleTrigger).not.toHaveBeenCalled();
    } finally {
      // Restore in `finally`: a failed assertion above would otherwise leak
      // `hidden` into every later test in this file.
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
    }
  });

  test('a background-tab impression re-arms and fires once the tab becomes visible', async () => {
    // Regression for the loss path this rebuild introduced: a page opened in a
    // background tab has every above-the-fold element already eligible from
    // load. If the dwell simply bailed while hidden, the timer would be gone
    // and the element's geometry would never change again - no scroll happens
    // anywhere in this test, deliberately, since a scroll would deliver a
    // fresh IntersectionObserver entry and mask the bug. The impression must
    // still fire once the tab is foregrounded, driven purely by the re-armed
    // timer.
    initVisibilityTracking(testScope, 1000);
    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 0, left: 0, width: 300, height: 200 }); // eligible from the start

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    try {
      triggerVisible(createTestContext(mockElb), element);

      // The initial dwell expires while still hidden: re-arm, don't fire.
      jest.advanceTimersByTime(1000);
      await drainMicrotasks();
      expect(handleTrigger).not.toHaveBeenCalled();

      // The tab is foregrounded. No scroll, no new IntersectionObserver entry:
      // only the re-armed timer can drive the next check.
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      // The retry that was armed while hidden expires now — but its dwell was
      // spent hidden, so it must NOT count: firing here could credit an
      // impression after ~0ms of actually visible time.
      jest.advanceTimersByTime(1000);
      await drainMicrotasks();
      expect(handleTrigger).not.toHaveBeenCalled();

      // One fresh, fully visible dwell later it fires.
      jest.advanceTimersByTime(1000);
      await drainMicrotasks();

      expect(handleTrigger).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
    }
  });

  test('an occluded dwell re-arms and fires once the occlusion clears in place', async () => {
    // Occlusion can clear without ANY geometry or intersection change: a cookie
    // banner is dismissed, a carousel swaps slides in place. No scroll happens
    // anywhere in this test, deliberately — the observer queues no entry, so
    // only a re-armed retry can rescue the impression.
    initVisibilityTracking(testScope, 1000);
    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 0, left: 0, width: 300, height: 200 }); // eligible from the start

    (isVisible as jest.Mock).mockReturnValue(false); // covered by an overlay
    triggerVisible(createTestContext(mockElb), element);

    // The dwell expires while occluded: re-arm, don't fire, don't strand.
    jest.advanceTimersByTime(1000);
    await drainMicrotasks();
    expect(handleTrigger).not.toHaveBeenCalled();

    // The overlay goes away. No geometry change, no observer entry.
    (isVisible as jest.Mock).mockReturnValue(true);

    jest.advanceTimersByTime(1000);
    await drainMicrotasks();

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('re-registering the same trigger replaces the config instead of duplicating it', async () => {
    // Overlapping scans hit this: a document run registers the element, then a
    // `walker init` on a container that already contained it registers it
    // again. Appending would make one dwell fire duplicate events.
    initVisibilityTracking(testScope, 1000);
    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 0, left: 0, width: 300, height: 200 });

    triggerVisible(createTestContext(mockElb), element);
    triggerVisible(createTestContext(mockElb), element); // re-scan, same trigger

    jest.advanceTimersByTime(1000);
    await drainMicrotasks();

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('a slow destination does not swallow the next visible event', async () => {
    // Defect: `blocked = true` used to be written AFTER `await handleTrigger()`.
    // If the user scrolls away mid-flight (which resets blocked = false), the late
    // write flips it back to true and the element's NEXT entry is silently dropped.
    initVisibilityTracking(testScope, 1000);
    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 1000, left: 0, width: 300, height: 200 });

    let release: (() => void) | undefined;
    (handleTrigger as jest.Mock).mockImplementation(
      () =>
        new Promise<unknown[]>((resolve) => {
          release = () => resolve([]);
        }),
    );

    triggerVisible(createTestContext(mockElb), element, { multiple: true });

    scrollTo(700); // eligible
    jest.advanceTimersByTime(1000); // dwell fires, handleTrigger hangs

    scrollTo(3000); // element leaves while the destination is still in flight
    if (release) release();
    await drainMicrotasks(); // let the late write land, if the bug is present

    scrollTo(700); // comes back
    jest.advanceTimersByTime(1000);
    await drainMicrotasks();

    expect(handleTrigger).toHaveBeenCalledTimes(2);
  });

  test('an element injected at 0x0 fires once it renders', async () => {
    initVisibilityTracking(testScope, 1000);

    const element = document.createElement('div');
    document.body.appendChild(element);
    // Mounted empty, inside the viewport: reports intersectionRatio 1 already.
    setBox(element, { top: 100, left: 0, width: 0, height: 0 });

    triggerVisible(createTestContext(mockElb), element);

    jest.advanceTimersByTime(1500);
    await Promise.resolve();
    expect(handleTrigger).not.toHaveBeenCalled(); // nothing on screen yet

    // The framework renders it. The IntersectionObserver stays SILENT here
    // (ratio 1 -> 1); only the ResizeObserver can wake us.
    resizeElement(element, 300, 200);

    jest.advanceTimersByTime(1500);
    await Promise.resolve();

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('a slow destination cannot double-fire a single-shot impression', async () => {
    // Defect: `unobserveElement` used to run AFTER `await handleTrigger()`. While
    // the destination is in flight the element is still observed and its config is
    // still present, so a second dwell can arm and fire the "single-shot"
    // impression a second time.
    initVisibilityTracking(testScope, 1000);
    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 1000, left: 0, width: 300, height: 200 });

    let release: (() => void) | undefined;
    (handleTrigger as jest.Mock).mockImplementation(
      () =>
        new Promise<unknown[]>((resolve) => {
          release = () => resolve([]);
        }),
    );

    triggerVisible(createTestContext(mockElb), element); // impression: single-shot

    scrollTo(700); // eligible => arm
    jest.advanceTimersByTime(1000); // dwell fires; handleTrigger hangs

    // Keep moving through threshold bands while the destination is in flight. A
    // correctly-unobserved element receives no further entries; a still-observed
    // one arms a second dwell and fires again.
    scrollTo(650);
    jest.advanceTimersByTime(1000);
    await drainMicrotasks();

    if (release) release();
    await drainMicrotasks();

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('impression and visible on the same element both fire', async () => {
    initVisibilityTracking(testScope, 1000);
    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 100, left: 0, width: 300, height: 200 });

    const context = createTestContext(mockElb);
    triggerVisible(context, element); // impression, single-shot
    triggerVisible(context, element, { multiple: true }); // visible, repeating

    jest.advanceTimersByTime(1000);
    await drainMicrotasks();

    expect(handleTrigger).toHaveBeenCalledTimes(2);
    expect(handleTrigger).toHaveBeenCalledWith(
      expect.anything(),
      element,
      'impression',
    );
    expect(handleTrigger).toHaveBeenCalledWith(
      expect.anything(),
      element,
      'visible',
    );
  });

  test('after both fire, only visible re-fires on re-entry', async () => {
    initVisibilityTracking(testScope, 1000);
    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 100, left: 0, width: 300, height: 200 });

    const context = createTestContext(mockElb);
    triggerVisible(context, element);
    triggerVisible(context, element, { multiple: true });

    jest.advanceTimersByTime(1000);
    await drainMicrotasks();
    (handleTrigger as jest.Mock).mockClear();

    scrollTo(2000); // leave
    scrollTo(0); // re-enter
    jest.advanceTimersByTime(1000);
    await drainMicrotasks();

    expect(handleTrigger).toHaveBeenCalledTimes(1);
    expect(handleTrigger).toHaveBeenCalledWith(
      expect.anything(),
      element,
      'visible',
    );
  });
});
