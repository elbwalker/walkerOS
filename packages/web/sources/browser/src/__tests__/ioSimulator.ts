export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Target {
  element: Element;
  thresholdIndex: number;
  isIntersecting: boolean;
}

interface FakeIO {
  callback: IntersectionObserverCallback;
  thresholds: number[];
  targets: Map<Element, Target>;
  instance: IntersectionObserver;
}

interface FakeRO {
  callback: ResizeObserverCallback;
  targets: Set<Element>;
  instance: ResizeObserver;
}

const boxes = new Map<Element, Box>();
const ios: FakeIO[] = [];
const ros: FakeRO[] = [];
let viewport = { width: 1024, height: 768 };
let scrollOffset = 0;

const rect = (r: {
  top: number;
  left: number;
  width: number;
  height: number;
}): DOMRectReadOnly =>
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

const boxOf = (element: Element): Box =>
  boxes.get(element) ?? { top: 0, left: 0, width: 0, height: 0 };

/** Viewport-relative box (document box shifted by the scroll offset). */
const viewportBox = (element: Element): Box => {
  const box = boxOf(element);
  return { ...box, top: box.top - scrollOffset };
};

/**
 * Per-spec threshold index: the count of thresholds the ratio has reached.
 * Returns 0 when not intersecting. This is what makes the simulator faithful:
 * every ratio inside one band maps to the same index, so no entry is queued.
 */
const thresholdIndexFor = (
  ratio: number,
  isIntersecting: boolean,
  thresholds: number[],
): number => {
  if (!isIntersecting) return 0;
  let index = 0;
  while (index < thresholds.length && ratio >= thresholds[index]) index++;
  return index;
};

const buildEntry = (element: Element): IntersectionObserverEntry => {
  const box = viewportBox(element);
  const boxRight = box.left + box.width;
  const boxBottom = box.top + box.height;

  const left = Math.max(box.left, 0);
  const top = Math.max(box.top, 0);
  const right = Math.min(boxRight, viewport.width);
  const bottom = Math.min(boxBottom, viewport.height);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  // A zero-area box still intersects if it lies within the root (spec 2.2.11).
  const overlaps =
    boxRight >= 0 &&
    box.left <= viewport.width &&
    boxBottom >= 0 &&
    box.top <= viewport.height;
  const hasArea = box.width > 0 && box.height > 0;
  const isIntersecting = overlaps && (hasArea ? width > 0 && height > 0 : true);

  const targetArea = box.width * box.height;
  // Spec 2.2.12: a zero-area target reports ratio 1 when intersecting, else 0.
  const intersectionRatio =
    targetArea > 0 ? (width * height) / targetArea : isIntersecting ? 1 : 0;

  return {
    target: element,
    time: 0,
    isIntersecting,
    intersectionRatio,
    boundingClientRect: rect(box),
    intersectionRect: rect({ top, left, width, height }),
    rootBounds: rect({
      top: 0,
      left: 0,
      width: viewport.width,
      height: viewport.height,
    }),
  } as IntersectionObserverEntry;
};

/** Deliver to every observer, but only where the spec says an entry is queued. */
const deliver = (): void => {
  ios.forEach((io) => {
    const entries: IntersectionObserverEntry[] = [];

    io.targets.forEach((target) => {
      const entry = buildEntry(target.element);
      const index = thresholdIndexFor(
        entry.intersectionRatio,
        entry.isIntersecting,
        io.thresholds,
      );

      // Spec 2.2.18: queue only when the threshold index changed OR
      // isIntersecting flipped. A bare ratio change queues nothing.
      if (
        index !== target.thresholdIndex ||
        entry.isIntersecting !== target.isIntersecting
      ) {
        target.thresholdIndex = index;
        target.isIntersecting = entry.isIntersecting;
        entries.push(entry);
      }
    });

    if (entries.length) io.callback(entries, io.instance);
  });
};

export const setBox = (element: Element, box: Box): void => {
  boxes.set(element, box);
  // jsdom's getBoundingClientRect always returns zeros. Wire it to the
  // simulator so production code that legitimately reads geometry OUTSIDE the
  // observer callback (the zero-area seed in triggerVisible, and isVisible at
  // dwell expiry) sees the same world the observer does.
  element.getBoundingClientRect = () => rect(viewportBox(element)) as DOMRect;
};

export const scrollTo = (y: number): void => {
  scrollOffset = y;
  deliver();
};

export const resizeElement = (
  element: Element,
  width: number,
  height: number,
): void => {
  const box = boxOf(element);
  if (box.width === width && box.height === height) return;
  boxes.set(element, { ...box, width, height });

  ros.forEach((ro) => {
    const entries: ResizeObserverEntry[] = [];
    ro.targets.forEach((target) => {
      if (target !== element) return;
      entries.push({
        target,
        contentRect: rect({ top: 0, left: 0, width, height }),
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      } as unknown as ResizeObserverEntry);
    });
    if (entries.length) ro.callback(entries, ro.instance);
  });

  deliver();
};

class SimIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds: ReadonlyArray<number>;
  private record: FakeIO;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    const raw = options?.threshold ?? [0];
    const thresholds = (Array.isArray(raw) ? raw : [raw])
      .slice()
      .sort((a, b) => a - b);
    this.thresholds = thresholds;
    this.record = {
      callback,
      thresholds,
      targets: new Map(),
      instance: this,
    };
    ios.push(this.record);
  }

  observe(element: Element): void {
    // Per spec, observing an already-observed target is a no-op. Modelling that
    // matters: production calls observe() from re-scan paths, and a simulator
    // that re-delivered here would manufacture a phantom "just became visible"
    // entry a real browser never sends - and could double-fire a dwell timer.
    // A later task's ResizeObserver rescue unobserves first, so it still works.
    if (this.record.targets.has(element)) return;

    // previousThresholdIndex starts at -1, so a FIRST observe() always
    // delivers exactly one entry.
    this.record.targets.set(element, {
      element,
      thresholdIndex: -1,
      isIntersecting: false,
    });
    const entry = buildEntry(element);
    const target = this.record.targets.get(element);
    if (!target) return;
    target.thresholdIndex = thresholdIndexFor(
      entry.intersectionRatio,
      entry.isIntersecting,
      this.record.thresholds,
    );
    target.isIntersecting = entry.isIntersecting;
    this.record.callback([entry], this);
  }

  unobserve(element: Element): void {
    this.record.targets.delete(element);
  }

  disconnect(): void {
    this.record.targets.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

class SimResizeObserver implements ResizeObserver {
  private record: FakeRO;

  constructor(callback: ResizeObserverCallback) {
    this.record = { callback, targets: new Set(), instance: this };
    ros.push(this.record);
  }

  observe(element: Element): void {
    this.record.targets.add(element);
  }

  unobserve(element: Element): void {
    this.record.targets.delete(element);
  }

  disconnect(): void {
    this.record.targets.clear();
  }
}

export const resetSim = (
  size: { width: number; height: number } = { width: 1024, height: 768 },
): void => {
  boxes.clear();
  ios.length = 0;
  ros.length = 0;
  viewport = { ...size };
  scrollOffset = 0;

  Object.defineProperty(window, 'innerWidth', {
    value: size.width,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: size.height,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, 'clientWidth', {
    value: size.width,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, 'clientHeight', {
    value: size.height,
    configurable: true,
  });

  window.IntersectionObserver =
    SimIntersectionObserver as unknown as typeof IntersectionObserver;
  globalThis.IntersectionObserver =
    SimIntersectionObserver as unknown as typeof IntersectionObserver;
  window.ResizeObserver = SimResizeObserver as unknown as typeof ResizeObserver;
  globalThis.ResizeObserver =
    SimResizeObserver as unknown as typeof ResizeObserver;
};
