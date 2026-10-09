/** Browser APIs jsdom lacks, as the demo tests need them. */

function mediaQueryList(matches: boolean, media: string): MediaQueryList {
  return {
    matches,
    media,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };
}

/** A `matchMedia` that matches every query, so reduced motion is preferred. */
export function preferReducedMotion(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => mediaQueryList(true, query),
  });
}

/**
 * An IntersectionObserver reporting every observed element at `ratio`, as
 * intersecting or not. Returns the options each observer was created with.
 */
export function observeAs(
  intersecting: boolean,
  ratio: number = intersecting ? 1 : 0,
): IntersectionObserverInit[] {
  const created: IntersectionObserverInit[] = [];
  class Observer {
    constructor(
      private readonly callback: (entries: IntersectionObserverEntry[]) => void,
      options: IntersectionObserverInit = {},
    ) {
      created.push(options);
    }
    observe(target: Element): void {
      const rect = target.getBoundingClientRect();
      this.callback([
        {
          target,
          isIntersecting: intersecting,
          intersectionRatio: ratio,
          boundingClientRect: rect,
          intersectionRect: rect,
          rootBounds: null,
          time: 0,
        },
      ]);
    }
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: Observer,
  });
  return created;
}
