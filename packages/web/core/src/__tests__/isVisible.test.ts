import {
  isVisible,
  deepElementFromPoint,
  composedAncestors,
  shadowHostsAbove,
} from '..';

describe('isVisible', () => {
  const w = window;

  test('isVisible', () => {
    const innerHeight = w.innerHeight;
    w.innerHeight = 100; // Create a small window

    // top/left/right/bottom must be internally consistent with x/y/width/height:
    // isVisible clips against the viewport using left/top/right/bottom directly,
    // so a rect where right/bottom don't match x+width/y+height would clip to a
    // zero-area band and fail before the display/visibility/opacity checks below
    // are even exercised.
    const x = 25,
      y = 25,
      width = 50,
      height = 50,
      top = y,
      right = x + width,
      bottom = y + height,
      left = x;

    // Create a mocked element
    const elem = document.createElement('div');
    Object.defineProperty(elem, 'offsetWidth', {
      value: width,
      writable: true,
    });
    Object.defineProperty(elem, 'offsetHeight', {
      value: height,
      writable: true,
    });
    Object.defineProperty(elem, 'clientHeight', {
      value: height,
      writable: true,
    });
    elem.getBoundingClientRect = jest.fn(() => ({
      x,
      y,
      width,
      height,
      top,
      right,
      bottom,
      left,
      toJSON: jest.fn,
    }));
    document.elementFromPoint = () => {
      return elem;
    };
    document.body.appendChild(elem);

    expect(isVisible(elem, window, document)).toBeTruthy();

    elem.style.display = 'none';
    expect(isVisible(elem, window, document)).toBeFalsy();
    elem.style.display = 'block';
    expect(isVisible(elem, window, document)).toBeTruthy();

    elem.style.visibility = 'hidden';
    expect(isVisible(elem, window, document)).toBeFalsy();
    elem.style.visibility = 'visible';
    expect(isVisible(elem, window, document)).toBeTruthy();

    elem.style.opacity = '0.0';
    expect(isVisible(elem, window, document)).toBeFalsy();
    elem.style.opacity = '1';
    expect(isVisible(elem, window, document)).toBeTruthy();

    Object.defineProperty(elem, 'clientHeight', {
      value: 250,
      writable: true,
    });
    expect(isVisible(elem, window, document)).toBeTruthy();

    w.innerHeight = innerHeight;
  });

  test('zero width/height elements should not be visible', () => {
    const originalElementFromPoint = document.elementFromPoint;

    // A zero-width (or zero-height) rect clips to an empty band regardless of
    // where elementFromPoint would hit, so isVisible must return false without
    // ever probing it.
    document.elementFromPoint = jest.fn();

    // Test zero width
    const elemZeroWidth = document.createElement('div');
    elemZeroWidth.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 10,
        width: 0,
        height: 50,
        top: 10,
        left: 10,
        right: 10,
        bottom: 60,
      }) as DOMRect;

    expect(isVisible(elemZeroWidth, window, document)).toBeFalsy();

    // Test zero height
    const elemZeroHeight = document.createElement('div');
    elemZeroHeight.getBoundingClientRect = () =>
      ({
        x: 10,
        y: 10,
        width: 50,
        height: 0,
        top: 10,
        left: 10,
        right: 60,
        bottom: 10,
      }) as DOMRect;

    expect(isVisible(elemZeroHeight, window, document)).toBeFalsy();

    expect(document.elementFromPoint).not.toHaveBeenCalled();

    document.elementFromPoint = originalElementFromPoint;
  });

  test('elements outside viewport bounds should not be visible', () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    const originalElementFromPoint = document.elementFromPoint;

    window.innerWidth = 100;
    window.innerHeight = 100;
    // Each rect below clips to an empty band against the 100x100 viewport, so
    // isVisible must return false without ever probing elementFromPoint.
    document.elementFromPoint = jest.fn();

    const elem = document.createElement('div');

    // Element entirely right of the viewport
    elem.getBoundingClientRect = () =>
      ({
        x: 150,
        y: 25,
        width: 50,
        height: 50,
        top: 25,
        left: 150,
        right: 200,
        bottom: 75,
      }) as DOMRect;
    expect(isVisible(elem, window, document)).toBeFalsy();

    // Element entirely below the viewport
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 150,
        width: 50,
        height: 50,
        top: 150,
        left: 25,
        right: 75,
        bottom: 200,
      }) as DOMRect;
    expect(isVisible(elem, window, document)).toBeFalsy();

    // Element entirely left of the viewport
    elem.getBoundingClientRect = () =>
      ({
        x: -100,
        y: 25,
        width: 50,
        height: 50,
        top: 25,
        left: -100,
        right: -50,
        bottom: 75,
      }) as DOMRect;
    expect(isVisible(elem, window, document)).toBeFalsy();

    // Element entirely above the viewport
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: -100,
        width: 50,
        height: 50,
        top: -100,
        left: 25,
        right: 75,
        bottom: -50,
      }) as DOMRect;
    expect(isVisible(elem, window, document)).toBeFalsy();

    expect(document.elementFromPoint).not.toHaveBeenCalled();

    document.elementFromPoint = originalElementFromPoint;
    window.innerWidth = originalInnerWidth;
    window.innerHeight = originalInnerHeight;
  });

  // Renamed from 'large elements visibility logic': there is no longer a
  // separate branch for elements taller than the viewport. The general
  // viewport-clip in isVisible handles them the same way it handles anything
  // else, probing the centre of the CLIPPED band rather than the element's own
  // centre (which is what the old dedicated branch used to compute).
  test('large elements: clipped-rect probing replaces the old dedicated branch', () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    window.innerWidth = 100;
    window.innerHeight = 100; // Small viewport

    const elem = document.createElement('div');

    // Large element entirely above the viewport: the clip against y:[0,100] is
    // empty (top=0, bottom=-80), so isVisible returns false without ever
    // probing elementFromPoint.
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: -200,
        width: 50,
        height: 120,
        top: -200,
        left: 25,
        right: 75,
        bottom: -80,
      }) as DOMRect;

    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = jest.fn(() => null);

    expect(isVisible(elem, window, document)).toBeFalsy();
    expect(document.elementFromPoint).not.toHaveBeenCalled();

    // Large element entirely below the viewport: clip is empty the other way
    // (top=150, bottom=100).
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 150,
        width: 50,
        height: 150,
        top: 150,
        left: 25,
        right: 75,
        bottom: 300,
      }) as DOMRect;
    document.elementFromPoint = jest.fn(() => null);

    expect(isVisible(elem, window, document)).toBeFalsy();
    expect(document.elementFromPoint).not.toHaveBeenCalled();

    // Large element that overlaps the viewport: probes the centre of the
    // CLIPPED band, x:[25,75] -> 50, y:[20,100] -> 60. The old branch would
    // have probed (50, 50): its own x-centre and windowHeight/2.
    const largeElem = document.createElement('div');
    largeElem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 20,
        width: 50,
        height: 120,
        top: 20,
        left: 25,
        right: 75,
        bottom: 140,
      }) as DOMRect;

    document.elementFromPoint = jest.fn(() => largeElem);

    expect(isVisible(largeElem, window, document)).toBeTruthy();
    expect(document.elementFromPoint).toHaveBeenCalledWith(50, 60);

    document.elementFromPoint = originalElementFromPoint;
    window.innerWidth = originalInnerWidth;
    window.innerHeight = originalInnerHeight;
  });

  test('element not found by elementFromPoint should return false', () => {
    const elem = document.createElement('div');
    Object.defineProperty(elem, 'offsetWidth', { value: 50 });
    Object.defineProperty(elem, 'offsetHeight', { value: 50 });
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 25,
        width: 50,
        height: 50,
      }) as DOMRect;

    // Mock elementFromPoint to return null
    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = () => null;

    expect(isVisible(elem, window, document)).toBeFalsy();

    document.elementFromPoint = originalElementFromPoint;
  });

  test('element with overlaying elements', () => {
    const elem = document.createElement('div');
    const overlay = document.createElement('div');
    const parent = document.createElement('div');

    Object.defineProperty(elem, 'offsetWidth', { value: 50 });
    Object.defineProperty(elem, 'offsetHeight', { value: 50 });
    elem.getBoundingClientRect = () =>
      ({
        x: 25,
        y: 25,
        width: 50,
        height: 50,
      }) as DOMRect;

    // Mock elementFromPoint to return overlay element
    const originalElementFromPoint = document.elementFromPoint;

    // Test when element is found directly
    document.elementFromPoint = () => elem;
    expect(isVisible(elem, window, document)).toBeTruthy();

    // Test when unrelated element is found - should be invisible
    document.elementFromPoint = () => overlay;
    expect(isVisible(elem, window, document)).toBeFalsy();

    // Test parent chain traversal - elem should be ancestor of what elementFromPoint returns
    // Set up chain: parent -> elem -> overlay (so overlay.parentElement === elem)
    Object.defineProperty(overlay, 'parentElement', {
      value: elem,
      writable: true,
    });
    Object.defineProperty(elem, 'parentElement', {
      value: parent,
      writable: true,
    });
    Object.defineProperty(parent, 'parentElement', {
      value: null,
      writable: true,
    });

    // When elementFromPoint returns overlay, it walks: overlay -> elem (match!) -> return true
    expect(isVisible(elem, window, document)).toBeTruthy();

    document.elementFromPoint = originalElementFromPoint;
  });
});

function mockGeometry(el: HTMLElement): void {
  Object.defineProperty(el, 'offsetWidth', { value: 50, writable: true });
  Object.defineProperty(el, 'offsetHeight', { value: 50, writable: true });
  el.style.display = 'block';
  el.style.visibility = 'visible';
  el.getBoundingClientRect = jest.fn(() => ({
    x: 25,
    y: 25,
    width: 50,
    height: 50,
    top: 25,
    right: 75,
    bottom: 75,
    left: 25,
    toJSON: jest.fn,
  }));
}

describe('deepElementFromPoint', () => {
  const originalElementFromPoint = document.elementFromPoint;

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint;
  });

  test('pierces an open shadow boundary to the inner element', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);

    document.elementFromPoint = () => host;
    shadow.elementFromPoint = jest.fn(() => inner);

    expect(deepElementFromPoint(document, 0, 0)).toBe(inner);
  });

  test('stops at the host for a closed shadow root', () => {
    const host = document.createElement('div');
    host.attachShadow({ mode: 'closed' });

    document.elementFromPoint = () => host;

    expect(deepElementFromPoint(document, 0, 0)).toBe(host);
  });

  test('returns null when the point hits nothing', () => {
    document.elementFromPoint = () => null;

    expect(deepElementFromPoint(document, 0, 0)).toBeNull();
  });

  test('breaks the loop when the inner hit equals the host', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    document.elementFromPoint = () => host;
    shadow.elementFromPoint = jest.fn(() => host);

    expect(deepElementFromPoint(document, 0, 0)).toBe(host);
  });
});

describe('composedAncestors', () => {
  test('walks light-DOM parents', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    parent.appendChild(child);

    expect(composedAncestors(child, window)).toEqual([parent]);
  });

  test('crosses an open shadow boundary to the host and light ancestors', () => {
    const lightParent = document.createElement('div');
    const host = document.createElement('div');
    lightParent.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);

    expect(composedAncestors(inner, window)).toEqual([host, lightParent]);
  });

  test('crosses a closed shadow boundary to the host', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);

    expect(composedAncestors(inner, window)).toEqual([host]);
  });
});

describe('shadowHostsAbove', () => {
  test('returns empty for a light-DOM element and excludes plain ancestors', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    parent.appendChild(child);

    expect(shadowHostsAbove(child, window)).toEqual([]);
  });

  test('returns the host for a closed-shadow element', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });
    const inner = document.createElement('div');
    shadow.appendChild(inner);

    expect(shadowHostsAbove(inner, window)).toEqual([host]);
  });

  test('returns nested hosts inner-to-outer', () => {
    const outerHost = document.createElement('div');
    const outerRoot = outerHost.attachShadow({ mode: 'open' });
    const innerHost = document.createElement('div');
    outerRoot.appendChild(innerHost);
    const innerRoot = innerHost.attachShadow({ mode: 'open' });
    const target = document.createElement('div');
    innerRoot.appendChild(target);

    expect(shadowHostsAbove(target, window)).toEqual([innerHost, outerHost]);
  });
});

describe('isVisible occlusion oracle', () => {
  const setRect = (el: HTMLElement, r: DOMRectInit): void => {
    el.getBoundingClientRect = () =>
      ({
        x: r.x,
        y: r.y,
        top: r.y,
        left: r.x,
        width: r.width,
        height: r.height,
        right: (r.x ?? 0) + (r.width ?? 0),
        bottom: (r.y ?? 0) + (r.height ?? 0),
        toJSON: () => r,
      }) as DOMRect;
  };

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 450,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: 450,
      configurable: true,
    });
  });

  // THE load-bearing test for this behaviour. The two tests below stub
  // elementFromPoint with a function that ignores its arguments, so they pass
  // whichever centre formula is used - they prove nothing on their own. This one
  // asserts the actual PROBE POINT, so it fails if anyone reverts to probing the
  // element's own centre.
  test('probes the centre of the VISIBLE band, not the element centre', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    // 2000px tall starting at -1500, in a 1000x450 viewport. It overflows the
    // viewport at BOTH ends, so its own centre (y = -1500 + 1000 = -500) is off
    // screen entirely. The visible band is y=[0,450], x=[0,1000] => centre
    // (500, 225). Probing the element's centre would hand elementFromPoint a
    // negative y and miss.
    setRect(el, { x: 0, y: -1500, width: 1000, height: 2000 });
    const probe = jest.fn(() => el);
    document.elementFromPoint = probe;

    expect(isVisible(el, window, document)).toBe(true);
    expect(probe).toHaveBeenCalledWith(500, 225);
  });

  test('an element taller than the viewport is visible when it covers the screen', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    // 716px tall, top at -100. Visible band y=[0,450] => probe centre y=225.
    setRect(el, { x: 0, y: -100, width: 1000, height: 716 });
    document.elementFromPoint = () => el;

    expect(isVisible(el, window, document)).toBe(true);
  });

  test('an element whose own centre is off screen is still visible', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    // 2000px tall starting at -1500: element centre is at y=-500, off screen.
    // The old implementation rejected this. The visible band is y=[0,450].
    setRect(el, { x: 0, y: -1500, width: 1000, height: 2000 });
    document.elementFromPoint = () => el;

    expect(isVisible(el, window, document)).toBe(true);
  });

  test('an ancestor with opacity 0 hides the element', () => {
    const wrapper = document.createElement('div');
    const el = document.createElement('div');
    wrapper.style.opacity = '0';
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);
    setRect(el, { x: 0, y: 100, width: 200, height: 100 });
    document.elementFromPoint = () => el;

    expect(isVisible(el, window, document)).toBe(false);
  });

  test('an element entirely off screen is not visible', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    setRect(el, { x: 0, y: 600, width: 200, height: 100 });
    document.elementFromPoint = () => el;

    expect(isVisible(el, window, document)).toBe(false);
  });

  test('an occluding overlay hides the element', () => {
    const el = document.createElement('div');
    const overlay = document.createElement('div');
    document.body.appendChild(el);
    document.body.appendChild(overlay);
    setRect(el, { x: 0, y: 100, width: 200, height: 100 });
    document.elementFromPoint = () => overlay;

    expect(isVisible(el, window, document)).toBe(false);
  });
});

describe('isVisible shadow DOM occlusion', () => {
  const originalElementFromPoint = document.elementFromPoint;

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint;
  });

  test('light exact hit is visible', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mockGeometry(target);

    document.elementFromPoint = () => target;

    expect(isVisible(target, window, document)).toBe(true);
  });

  test('light unrelated overlay is not visible', () => {
    const target = document.createElement('div');
    const overlay = document.createElement('div');
    document.body.appendChild(target);
    document.body.appendChild(overlay);
    mockGeometry(target);

    document.elementFromPoint = () => overlay;

    expect(isVisible(target, window, document)).toBe(false);
  });

  test('light descendant hit is visible', () => {
    const target = document.createElement('div');
    const child = document.createElement('div');
    target.appendChild(child);
    document.body.appendChild(target);
    mockGeometry(target);

    document.elementFromPoint = () => child;

    expect(isVisible(target, window, document)).toBe(true);
  });

  test('open-shadow inner hit equal to the target is visible', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const target = document.createElement('div');
    shadow.appendChild(target);
    document.body.appendChild(host);
    mockGeometry(target);

    document.elementFromPoint = () => host;
    shadow.elementFromPoint = jest.fn(() => target);

    expect(isVisible(target, window, document)).toBe(true);
  });

  test('open-shadow occluder that is not in either chain is not visible', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const target = document.createElement('div');
    const occluder = document.createElement('div');
    shadow.appendChild(target);
    shadow.appendChild(occluder);
    document.body.appendChild(host);
    mockGeometry(target);

    document.elementFromPoint = () => host;
    shadow.elementFromPoint = jest.fn(() => occluder);

    expect(isVisible(target, window, document)).toBe(false);
  });

  test('closed-shadow host hit resolves the target as visible', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });
    const target = document.createElement('div');
    shadow.appendChild(target);
    document.body.appendChild(host);
    mockGeometry(target);

    document.elementFromPoint = () => host;

    expect(isVisible(target, window, document)).toBe(true);
  });

  test('light plain ancestor hit does not loosen occlusion', () => {
    const ancestor = document.createElement('div');
    const target = document.createElement('div');
    ancestor.appendChild(target);
    document.body.appendChild(ancestor);
    mockGeometry(target);

    document.elementFromPoint = () => ancestor;

    expect(isVisible(target, window, document)).toBe(false);
  });

  test('open-shadow wrapper ancestor within the same root preserves occlusion', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    const target = document.createElement('div');
    wrapper.appendChild(target);
    shadow.appendChild(wrapper);
    document.body.appendChild(host);
    mockGeometry(target);

    document.elementFromPoint = () => host;
    shadow.elementFromPoint = jest.fn(() => wrapper);

    expect(isVisible(target, window, document)).toBe(false);
  });
});
