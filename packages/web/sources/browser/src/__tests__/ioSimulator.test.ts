import { resetSim, setBox, scrollTo, resizeElement } from './ioSimulator';

describe('ioSimulator', () => {
  beforeEach(() => resetSim({ width: 1000, height: 450 }));

  test('delivers an initial entry on observe', () => {
    const el = document.createElement('div');
    setBox(el, { top: 2000, left: 0, width: 300, height: 200 });

    const seen: IntersectionObserverEntry[] = [];
    const io = new IntersectionObserver((entries) => seen.push(...entries), {
      threshold: [0, 0.5],
    });
    io.observe(el);

    expect(seen).toHaveLength(1);
    expect(seen[0].isIntersecting).toBe(false);
  });

  test('a zero-area target inside the viewport reports intersectionRatio 1', () => {
    const el = document.createElement('div');
    setBox(el, { top: 100, left: 0, width: 0, height: 0 });

    const seen: IntersectionObserverEntry[] = [];
    new IntersectionObserver((entries) => seen.push(...entries), {
      threshold: [0, 0.5],
    }).observe(el);

    expect(seen[0].isIntersecting).toBe(true);
    expect(seen[0].intersectionRatio).toBe(1);
  });

  test('NO entry is delivered while the ratio moves inside one threshold band', () => {
    // 716px card, 450px viewport => ratio ceiling 450/716 = 0.63.
    const el = document.createElement('div');
    setBox(el, { top: 1000, left: 0, width: 300, height: 716 });

    const seen: IntersectionObserverEntry[] = [];
    new IntersectionObserver((entries) => seen.push(...entries), {
      threshold: [0, 0.5],
    }).observe(el);

    // Two entries are legitimately delivered and must be discarded before the
    // real assertion: the initial observe() entry (not intersecting), and the
    // enter-crossing below, where isIntersecting flips false -> true. An
    // isIntersecting flip queues an entry regardless of ratio.
    scrollTo(600); // card top 400, ratio 0.07 -> ENTERS the viewport
    expect(seen.length).toBeGreaterThan(0); // the flip really does deliver
    seen.length = 0;

    // Now the card is already intersecting and stays in the [0, 0.5) band the
    // whole way: card top 300 -> 240 -> 180 -> 120, ratio climbing 0.21 -> 0.46.
    // No threshold index change, no isIntersecting flip => total silence.
    // This is the defect: the trigger is never asked about the element again.
    [700, 760, 820, 880].forEach((y) => scrollTo(y));

    expect(seen).toHaveLength(0);
  });

  test('growing a fully-visible element from 0x0 delivers NO entry (ratio pinned at 1)', () => {
    const el = document.createElement('div');
    setBox(el, { top: 100, left: 0, width: 0, height: 0 });

    const seen: IntersectionObserverEntry[] = [];
    new IntersectionObserver((entries) => seen.push(...entries), {
      threshold: [0, 0.05, 0.5, 1],
    }).observe(el);
    seen.length = 0;

    resizeElement(el, 300, 200); // still fully inside the 1000x450 viewport

    expect(seen).toHaveLength(0); // ratio 1 -> 1, threshold index unchanged
  });

  test('ResizeObserver reports the size change the IntersectionObserver hid', () => {
    const el = document.createElement('div');
    setBox(el, { top: 100, left: 0, width: 0, height: 0 });

    const sizes: Array<{ width: number; height: number }> = [];
    new ResizeObserver((entries) => {
      entries.forEach((e) =>
        sizes.push({
          width: e.contentRect.width,
          height: e.contentRect.height,
        }),
      );
    }).observe(el);

    resizeElement(el, 300, 200);

    expect(sizes).toEqual([{ width: 300, height: 200 }]);
  });

  test('re-observing an already-observed target is a no-op (spec)', () => {
    const el = document.createElement('div');
    setBox(el, { top: 100, left: 0, width: 300, height: 200 });

    const seen: IntersectionObserverEntry[] = [];
    const io = new IntersectionObserver((entries) => seen.push(...entries), {
      threshold: [0, 0.5],
    });
    io.observe(el);
    expect(seen).toHaveLength(1); // the one legitimate initial entry

    io.observe(el); // a real browser ignores this entirely
    expect(seen).toHaveLength(1);

    // but after an explicit unobserve, observing again DOES deliver afresh
    io.unobserve(el);
    io.observe(el);
    expect(seen).toHaveLength(2);
  });
});
