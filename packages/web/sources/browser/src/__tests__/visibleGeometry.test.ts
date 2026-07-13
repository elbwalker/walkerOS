import type { Elb } from '@walkeros/core';
import type { Context } from '../types';
import {
  isEligible,
  initVisibilityTracking,
  triggerVisible,
  destroyVisibilityTracking,
} from '../triggerVisible';
import { resetSim, setBox, scrollTo } from './ioSimulator';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const rect = (r: Rect): DOMRectReadOnly =>
  ({
    x: r.left,
    y: r.top,
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    right: r.left + r.width,
    bottom: r.top + r.height,
    toJSON: () => r,
  }) as DOMRectReadOnly;

/** Build an entry for an element box against a viewport, clipping as the browser does. */
const entryFor = (
  box: Rect,
  viewport: { width: number; height: number },
  rootBounds = true,
): IntersectionObserverEntry => {
  const left = Math.max(box.left, 0);
  const top = Math.max(box.top, 0);
  const right = Math.min(box.left + box.width, viewport.width);
  const bottom = Math.min(box.top + box.height, viewport.height);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const area = box.width * box.height;
  const isIntersecting = width > 0 && height > 0;

  return {
    target: document.createElement('div'),
    time: 0,
    isIntersecting: area > 0 ? isIntersecting : true,
    intersectionRatio: area > 0 ? (width * height) / area : 1,
    boundingClientRect: rect(box),
    intersectionRect: rect({ top, left, width, height }),
    rootBounds: rootBounds
      ? rect({
          top: 0,
          left: 0,
          width: viewport.width,
          height: viewport.height,
        })
      : null,
  } as IntersectionObserverEntry;
};

const win = (width: number, height: number): Window =>
  ({ innerWidth: width, innerHeight: height }) as Window;

describe('isEligible', () => {
  test('small element: unchanged 50%-of-element behaviour', () => {
    const viewport = { width: 1440, height: 900 };
    // 300x200 card, fully on screen
    expect(
      isEligible(
        entryFor({ top: 100, left: 0, width: 300, height: 200 }, viewport),
        win(1440, 900),
      ),
    ).toBe(true);

    // only 40px of a 200px-tall card on screen -> below half its own height
    expect(
      isEligible(
        entryFor({ top: 860, left: 0, width: 300, height: 200 }, viewport),
        win(1440, 900),
      ),
    ).toBe(false);
  });

  test("customer's 716px card on a 450px viewport: predicate's bar sits at 225px on screen", () => {
    const viewport = { width: 1440, height: 450 };
    const card = { left: 0, width: 1200, height: 716 };

    // 224px on screen -> just under half the viewport -> not yet
    expect(
      isEligible(
        entryFor({ ...card, top: 450 - 224 }, viewport),
        win(1440, 450),
      ),
    ).toBe(false);

    // 226px on screen -> over half the viewport -> eligible
    // (today this needs 358px, i.e. 80% of the whole screen)
    expect(
      isEligible(
        entryFor({ ...card, top: 450 - 226 }, viewport),
        win(1440, 450),
      ),
    ).toBe(true);
  });

  test('wide short row: the axis an area-based clamp cannot see', () => {
    // 3000x80 banner in a horizontal scroller, viewport 1440x900.
    // Element ratio maxes out at 0.48 and viewport AREA coverage at 0.089,
    // so both element-relative and area-clamped predicates never fire.
    const viewport = { width: 1440, height: 900 };
    expect(
      isEligible(
        entryFor({ top: 400, left: 0, width: 3000, height: 80 }, viewport),
        win(1440, 900),
      ),
    ).toBe(true);
  });

  test('10x-viewport section fires once it covers half the viewport', () => {
    const viewport = { width: 1000, height: 800 };
    const section = { left: 0, width: 1000, height: 8000 };

    expect(
      isEligible(
        entryFor({ ...section, top: 800 - 399 }, viewport),
        win(1000, 800),
      ),
    ).toBe(false);
    expect(
      isEligible(
        entryFor({ ...section, top: 800 - 401 }, viewport),
        win(1000, 800),
      ),
    ).toBe(true);
  });

  test('zero-area element is never eligible despite reporting ratio 1', () => {
    const viewport = { width: 1000, height: 800 };
    const entry = entryFor(
      { top: 100, left: 0, width: 0, height: 0 },
      viewport,
    );
    expect(entry.intersectionRatio).toBe(1); // the trap
    expect(isEligible(entry, win(1000, 800))).toBe(false);
  });

  test('null rootBounds (cross-origin iframe) falls back to the window', () => {
    const viewport = { width: 1440, height: 450 };
    const entry = entryFor(
      { top: 450 - 300, left: 0, width: 1200, height: 716 },
      viewport,
      false, // rootBounds === null
    );
    expect(entry.rootBounds).toBeNull();
    // must not produce NaN >= x === false and silently disable the trigger
    expect(isEligible(entry, win(1440, 450))).toBe(true);
  });
});

// Helper function to create test context (mirrors triggerVisible.test.ts).
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

// A single `await Promise.resolve()` advances the microtask queue by exactly
// one tick. `Promise.all` plus fire()'s continuation need several, so a test
// that inspects state after one tick sees a write that has not landed yet -
// and then passes for the wrong reason. Drain properly.
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

describe('real-world geometries (regression)', () => {
  let mockElb: jest.MockedFunction<Elb.Fn>;

  beforeEach(() => {
    jest.useFakeTimers();
    (isVisible as jest.Mock).mockReturnValue(true);
    (handleTrigger as jest.Mock).mockResolvedValue([]);

    mockElb = jest.fn().mockResolvedValue({
      ok: true,
    });
  });

  afterEach(() => {
    destroyVisibilityTracking(document);
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("customer's 716px card fires while scrolling a 450px viewport", async () => {
    resetSim({ width: 1440, height: 450 });
    initVisibilityTracking(document, 1000);

    const card = document.createElement('div');
    document.body.appendChild(card);
    setBox(card, { top: 1425, left: 0, width: 1200, height: 716 });
    triggerVisible(createTestContext(mockElb), card, { multiple: true });

    // The 225px half-viewport bar itself (224 vs 226 on screen) is already
    // pinned exactly by the pure isEligible test above. The threshold grid is
    // quantized: 224px and 226px on screen both land inside the same 1%-wide
    // ratio band (0.31-0.32; 225/716 = 0.314), so the observer would deliver
    // only ONE entry across that pair, not two - the second scroll would be
    // silent and this test would pass for the wrong reason (or not at all).
    // Here we drive two positions that land in genuinely different threshold
    // bands, to prove the real dwell-and-fire pipeline for this exact
    // geometry: clearly under the bar, then clearly over it.
    // 200px on screen (ratio 0.28, band [0.27, 0.28)): under the 225px bar.
    scrollTo(1425 - (450 - 200));
    jest.advanceTimersByTime(1500);
    await drainMicrotasks();
    expect(handleTrigger).not.toHaveBeenCalled();

    // 300px on screen (ratio 0.42, band [0.41, 0.42)): over the 225px bar.
    // Today's element-relative rule needs 358px (80% of the whole screen).
    scrollTo(1425 - (450 - 300));
    jest.advanceTimersByTime(1500);
    await drainMicrotasks();
    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('8000px section (10x viewport) fires at all', async () => {
    resetSim({ width: 1000, height: 800 });
    initVisibilityTracking(document, 1000);

    const section = document.createElement('div');
    document.body.appendChild(section);
    setBox(section, { top: 2000, left: 0, width: 1000, height: 8000 });
    triggerVisible(createTestContext(mockElb), section);

    // Ratio ceiling is 800/8000 = 0.1, so it can NEVER reach the old 0.5 bar.
    // It needs 400px on screen (half the viewport). Section top in the
    // viewport is (documentTop - scrollOffset); on-screen coverage for a
    // section this much taller than the viewport is (viewportHeight - top),
    // so `scrollTo(2000 - X)` yields (800 - X)px on screen, not Xpx.
    // scrollTo(2000 - 500) puts the top at 500 -> 300px on screen: not yet.
    scrollTo(2000 - 500);
    jest.advanceTimersByTime(1500);
    await drainMicrotasks();
    expect(handleTrigger).not.toHaveBeenCalled();

    // scrollTo(2000 - 350) puts the top at 350 -> 450px on screen: over half
    // the viewport. The entry that carries this is only delivered because the
    // grid has a threshold at 0.05 (= COVERAGE * V/H); with [0, 0.5] the
    // observer is silent here forever.
    scrollTo(2000 - 350);
    jest.advanceTimersByTime(1500);
    await drainMicrotasks();
    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('exactly-2x-viewport element is not lost to the sub-pixel cliff', async () => {
    // Max ratio is exactly 0.5, which real engines report as 0.4999... and
    // isIntersecting false at the boundary. The clamped predicate never asks.
    resetSim({ width: 1000, height: 450 });
    initVisibilityTracking(document, 1000);

    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 1000, left: 0, width: 1000, height: 900 });
    triggerVisible(createTestContext(mockElb), element);

    scrollTo(1000 - 200); // 250px on screen, over half the 450px viewport
    jest.advanceTimersByTime(1500);
    await drainMicrotasks();

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('wide 3000x80 row in a horizontal scroller fires', async () => {
    resetSim({ width: 1440, height: 900 });
    initVisibilityTracking(document, 1000);

    const row = document.createElement('div');
    document.body.appendChild(row);
    setBox(row, { top: 1000, left: 0, width: 3000, height: 80 });
    triggerVisible(createTestContext(mockElb), row);

    scrollTo(600); // row fully on screen vertically
    jest.advanceTimersByTime(1500);
    await drainMicrotasks();

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  test('the observer callback performs no DOM reads', () => {
    resetSim({ width: 1000, height: 450 });
    initVisibilityTracking(document, 1000);

    const element = document.createElement('div');
    document.body.appendChild(element);
    setBox(element, { top: 1000, left: 0, width: 300, height: 200 });
    triggerVisible(createTestContext(mockElb), element);

    // Trip a wire on every layout-forcing read, THEN scroll.
    //
    // Patch BOTH the instance and the prototype. setBox installs an OWN
    // getBoundingClientRect on the element (so a prototype-only patch would never
    // see it), while a callback reading some OTHER element's geometry - a parent,
    // document.body - would slip past an instance-only patch.
    const forbidden = jest.fn();
    const instanceRect = element.getBoundingClientRect.bind(element);
    const protoRect = Element.prototype.getBoundingClientRect;
    const realStyle = window.getComputedStyle;

    element.getBoundingClientRect = () => {
      forbidden();
      return instanceRect();
    };
    Element.prototype.getBoundingClientRect = function (this: Element) {
      forbidden();
      return protoRect.call(this);
    };
    window.getComputedStyle = ((el: Element) => {
      forbidden();
      return realStyle(el);
    }) as typeof window.getComputedStyle;

    try {
      // Ascending, not descending: 600 -> 650 -> 700 puts 50px, then 100px,
      // then 150px of the 200px-tall element on screen (the 100px step sits
      // exactly on the 50%-of-200 bar). Ending on the most-visible position
      // leaves the dwell timer armed, which the positive control below
      // depends on - the descending order ends BELOW the bar, cancels the
      // timer that an earlier step armed, and starves that assertion.
      scrollTo(600);
      scrollTo(650);
      scrollTo(700);

      expect(forbidden).not.toHaveBeenCalled();

      // Load-bearing. `isVisible` is MOCKED in this suite, and isVisible is
      // exactly what runs getComputedStyle + elementFromPoint in production - so
      // the tripwire above cannot see it. Without this assertion the test is blind
      // to the single most likely regression: hoisting the occlusion check back
      // into the observer callback, which is literally the pre-fix architecture.
      expect(isVisible).not.toHaveBeenCalled();
    } finally {
      // Restore in `finally`: a throw above would otherwise leak the patches into
      // every later test in the process.
      element.getBoundingClientRect = instanceRect;
      Element.prototype.getBoundingClientRect = protoRect;
      window.getComputedStyle = realStyle;
    }

    // Positive control. Without this the test could pass by observing NOTHING at
    // all - a future change that silently stopped delivering entries would leave
    // it green while pinning nothing. Letting the dwell expire must reach
    // isVisible, which proves the callback really did run and arm a timer.
    jest.advanceTimersByTime(1500);
    expect(isVisible).toHaveBeenCalled();
  });
});
