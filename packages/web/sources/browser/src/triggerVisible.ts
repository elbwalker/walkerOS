import type { Context, InitScope } from './types';
import { tryCatch } from '@walkeros/core';
import { isVisible } from '@walkeros/web-core';
import { handleTrigger, Triggers } from './trigger';

// Fraction of the element, or of the viewport, whichever is smaller, that must
// be on screen along each axis.
const COVERAGE = 0.5;

/**
 * Decide from the observer entry alone whether an element is showing enough of
 * itself to start the dwell clock. Reads no DOM and forces no layout: every
 * rect here was computed by the browser during this frame's layout pass.
 *
 * `intersectionRatio` cannot be used directly. It is a fraction of the
 * element's own area, so an element bigger than the viewport along an axis can
 * never show COVERAGE of itself along it: a 716px card in a 450px viewport
 * tops out at 0.63, and an 8000px section tops out at 0.1. Clamping the
 * requirement to `min(element, viewport)` per axis makes the bar reachable for
 * any geometry, and gives the property customers actually expect: shrinking the
 * viewport can only make the trigger fire earlier, never later.
 *
 * The clamp is per axis rather than by area on purpose. An area clamp collapses
 * back to the element-relative rule whenever the element's area is smaller than
 * the viewport's, which is exactly the wide-but-short case (a 3000x80 row tops
 * out at ratio 0.48 and never fires).
 */
export function isEligible(
  entry: IntersectionObserverEntry,
  win: Window,
): boolean {
  if (!entry.isIntersecting) return false;

  const box = entry.boundingClientRect;
  // A zero-area target reports intersectionRatio 1 while it is intersecting
  // (spec 2.2.12). It has nothing on screen; never start a dwell for it.
  if (box.width <= 0 || box.height <= 0) return false;

  // rootBounds is null when the target lives in a cross-origin iframe. Falling
  // back to the window keeps the arithmetic finite: a NaN would compare false
  // and silently disable the trigger for every such element.
  const rootWidth = entry.rootBounds ? entry.rootBounds.width : win.innerWidth;
  const rootHeight = entry.rootBounds
    ? entry.rootBounds.height
    : win.innerHeight;
  if (rootWidth <= 0 || rootHeight <= 0) return false;

  const visible = entry.intersectionRect;
  const needWidth = COVERAGE * Math.min(box.width, rootWidth);
  const needHeight = COVERAGE * Math.min(box.height, rootHeight);

  return visible.width >= needWidth && visible.height >= needHeight;
}

// Threshold grid for the observer.
//
// An entry is queued only when the crossed threshold INDEX changes; a bare ratio
// change queues nothing. The grid is therefore not a performance dial, it is the
// SAMPLING RATE of the predicate: the trigger can only notice an element became
// eligible at a grid crossing, which quantizes the arm point UPWARD to the next
// threshold.
//
// A coarse grid makes that error large. Eligibility for an element of height H in
// a viewport of height V lands at ratio COVERAGE * V/H, which for a 716px card in
// a 450px viewport is 0.314. A grid whose next step above that is 0.4 would not
// arm until 287px was showing, against a true bar of 225px.
//
// A uniform 1% grid keeps the error within about 1% of the element and costs
// effectively nothing: the observer queues at most ONE entry per target per frame
// however many thresholds there are.
const THRESHOLDS = Array.from({ length: 101 }, (_, index) => index / 100);

interface ElementConfig {
  multiple: boolean;
  blocked: boolean;
  context: Context;
  trigger: string;
}

interface VisibilityState {
  observer?: IntersectionObserver;
  resizeObserver?: ResizeObserver;
  timers: WeakMap<HTMLElement, number>;
  duration: number;
  configs: WeakMap<HTMLElement, ElementConfig[]>;
  // Elements last seen without a layout box. A 0x0 target reports ratio 1, so
  // growing one into view never changes the threshold index and the observer
  // stays silent; the ResizeObserver re-observes to force a fresh entry.
  zeroArea: WeakSet<HTMLElement>;
}

// Module-level visibility state keyed by the owner document. Both an element
// sub-scope and its document normalize to the same key (see getScopeKey), so
// there is exactly one IntersectionObserver per document: create-key and
// lookup-key can never diverge, and iframes still get their own observer.
const visibilityStates = new WeakMap<Document | Element, VisibilityState>();

/**
 * Normalize any scope (document or element) to its owner document. The
 * IntersectionObserver root is always the viewport, so per-sub-scope observers
 * would be meaningless; keying by ownerDocument gives one shared observer per
 * document and keeps the create/lookup keys aligned.
 */
export function getScopeKey(scope: InitScope): Document | Element {
  return (scope as Element).ownerDocument || (scope as Document);
}

function createObserver(
  scope: Document | Element,
): IntersectionObserver | undefined {
  const doc = (scope as Element).ownerDocument || (scope as Document);
  const win = doc.defaultView;
  if (!win || !win.IntersectionObserver) return undefined;

  return tryCatch(
    () =>
      new win.IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => handleIntersection(scope, entry));
        },
        { rootMargin: '0px', threshold: THRESHOLDS },
      ),
    () => undefined,
  )();
}

function handleIntersection(
  scope: Document | Element,
  entry: IntersectionObserverEntry,
): void {
  const target = entry.target as HTMLElement;
  const state = visibilityStates.get(getScopeKey(scope));
  if (!state) return;

  const win = target.ownerDocument.defaultView;
  if (!win) return;

  const configs = state.configs.get(target);
  // An entry can be queued before an unobserve lands. Never arm a dwell for an
  // element the module has already released.
  if (!configs || !configs.length) return;

  const existingTimer = state.timers.get(target);

  if (isEligible(entry, win)) {
    // Every trigger on this element has fired and is waiting to re-enter.
    if (configs.every((config) => config.blocked)) return;

    if (!existingTimer) {
      const timer = win.setTimeout(() => {
        fire(getScopeKey(scope), target);
      }, state.duration);
      state.timers.set(target, timer);
    }
    return;
  }

  // Below the bar: cancel the armed dwell and re-arm the repeating triggers.
  if (existingTimer) {
    clearTimeout(existingTimer);
    state.timers.delete(target);
  }
  configs.forEach((config) => {
    if (config.multiple) config.blocked = false;
  });
}

async function fire(
  scope: Document | Element,
  target: HTMLElement,
): Promise<void> {
  const state = visibilityStates.get(scope);
  if (!state) return;

  // Release the timer on EVERY path, before anything can bail. Leaving a fired
  // timer id behind makes `!existingTimer` false forever, which permanently
  // prevents the element from arming again: it is dead for the page session.
  state.timers.delete(target);

  const doc = target.ownerDocument;
  const win = doc.defaultView;
  if (!win) return;

  // Never count an impression the user could not possibly have seen. Re-arm
  // rather than drop: a page opened in a background tab has every above-the-fold
  // element already eligible, and its geometry will never change again, so the
  // observer would queue no further entry and the impression would be lost for
  // the whole session even after the user foregrounds the tab and reads the
  // page. Background timers are throttled to roughly one per second, so the
  // retry is cheap, and it stops as soon as the tab is visible.
  if (doc.visibilityState !== 'visible') {
    state.timers.set(
      target,
      win.setTimeout(() => {
        fire(scope, target);
      }, state.duration),
    );
    return;
  }

  // The one and only occlusion check, uncached, on one element.
  if (!isVisible(target, win, doc)) return;

  const configs = state.configs.get(target);
  if (!configs) return;

  const pending = configs.filter((config) => !config.blocked);
  if (!pending.length) return;

  // Commit state BEFORE awaiting. handleTrigger can outlast the dwell on a slow
  // destination, and a late write would clobber state that the not-eligible
  // branch has since reset, swallowing the element's next event.
  pending.forEach((config) => {
    if (config.multiple) config.blocked = true;
  });

  const remaining = configs.filter((config) => config.multiple);
  if (remaining.length) {
    state.configs.set(target, remaining);
  } else {
    // Single-shot impressions are done. Unobserve before the await so a second
    // dwell cannot arm and double-fire while the destination is in flight.
    unobserveElement(scope, target);
  }

  await Promise.all(
    pending.map((config) =>
      handleTrigger(config.context, target, config.trigger),
    ),
  );
}

export function unobserveElement(scope: InitScope, element: HTMLElement): void {
  const state = visibilityStates.get(getScopeKey(scope));
  if (!state) return;

  state.observer?.unobserve(element);
  state.resizeObserver?.unobserve(element);
  state.configs.delete(element);
  state.zeroArea.delete(element);

  const timer = state.timers.get(element);
  if (timer) {
    clearTimeout(timer);
    state.timers.delete(element);
  }
}

/**
 * Rescue the one case an IntersectionObserver cannot report.
 *
 * A zero-area target reports intersectionRatio 1 while it intersects (spec
 * 2.2.12). When a framework mounts an element empty and renders it a frame
 * later, the ratio goes 1 -> 1, the threshold index never changes, and the
 * observer queues NO entry - at any threshold density. Re-observing resets the
 * observer's per-target bookkeeping (previousThresholdIndex back to -1), which
 * forces a fresh entry on the next frame.
 *
 * Gated on the zero -> laid-out transition, so a resizing animation cannot turn
 * this into a per-frame re-observe storm.
 */
function createResizeObserver(
  scope: Document | Element,
): ResizeObserver | undefined {
  const doc = (scope as Element).ownerDocument || (scope as Document);
  const win = doc.defaultView;
  if (!win || !win.ResizeObserver) return undefined;

  return tryCatch(
    () =>
      new win.ResizeObserver((entries) => {
        const state = visibilityStates.get(scope);
        if (!state?.observer) return;

        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          const { width, height } = entry.contentRect;
          const isZero = width <= 0 || height <= 0;

          if (isZero) {
            state.zeroArea.add(target);
            return;
          }

          if (!state.zeroArea.has(target)) return;
          state.zeroArea.delete(target);

          state.observer?.unobserve(target);
          state.observer?.observe(target);
        });
      }),
    () => undefined,
  )();
}

export function initVisibilityTracking(
  scope: InitScope,
  duration = 1000,
): void {
  const key = getScopeKey(scope);
  if (visibilityStates.has(key)) return;

  visibilityStates.set(key, {
    observer: createObserver(key),
    resizeObserver: createResizeObserver(key),
    timers: new WeakMap(),
    duration,
    configs: new WeakMap(),
    zeroArea: new WeakSet(),
  });
}

export function triggerVisible(
  context: Context,
  element: HTMLElement,
  config: { multiple?: boolean } = { multiple: false },
): void {
  const scope = context.settings.scope;
  if (!scope) return;
  const state = visibilityStates.get(getScopeKey(scope));
  if (!state?.observer || !element) return;

  const multiple = config.multiple ?? false;
  const configs = state.configs.get(element) ?? [];
  configs.push({
    multiple,
    blocked: false,
    context,
    trigger: multiple ? Triggers.Visible : Triggers.Impression,
  });
  state.configs.set(element, configs);

  // One element can carry both `impression` and `visible`; observe it once.
  if (configs.length > 1) return;

  const box = element.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) state.zeroArea.add(element);

  state.observer.observe(element);
  state.resizeObserver?.observe(element);
}

export function destroyVisibilityTracking(scope?: InitScope): void {
  if (!scope) return;
  const key = getScopeKey(scope);
  const state = visibilityStates.get(key);
  if (!state) return;

  state.observer?.disconnect();
  state.resizeObserver?.disconnect();
  visibilityStates.delete(key);
}
